import re
import json
import psycopg
from psycopg.rows import dict_row
from apps.backend import config

def sql(query: str, params=None):
    """
    Executes a PostgreSQL query on Neon.
    Automatically converts JS-style $1, $2, ... placeholders to psycopg %s.
    """
    if not config.DATABASE_URL:
        raise ValueError("DATABASE_URL is not defined in the environment config.")
        
    # Convert positional placeholders like $1, $2 to %s (used by psycopg)
    # Be careful not to replace text like '$100' inside text strings.
    # In SQL queries, parameters are typically written as $1, $2, etc.
    query_converted = re.sub(r'(?<!\w)\$(\d+)\b', '%s', query)
    
    # Process params to ensure JSON objects are dumped to strings
    processed_params = []
    if params:
        for p in params:
            if isinstance(p, (dict, list)):
                processed_params.append(json.dumps(p))
            else:
                processed_params.append(p)
                
    with psycopg.connect(config.DATABASE_URL, row_factory=dict_row) as conn:
        with conn.cursor() as cur:
            cur.execute(query_converted, processed_params)
            # If it's a SELECT or RETURNING query, fetch results
            if cur.description is not None:
                results = cur.fetchall()
                # psycopg dict_row returns dictionaries. Convert datetime objects to string for JSON serialization
                for row in results:
                    for key, val in row.items():
                        if hasattr(val, 'isoformat'):
                            row[key] = val.isoformat()
                return results
            conn.commit()
            return []
