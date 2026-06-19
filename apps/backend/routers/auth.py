import json
import os
from fastapi import APIRouter, Request, Response
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi_nextauth_jwt import NextAuthJWT

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Retrieve AUTH_SECRET from config or environment. NextAuth JWE decryption requires this secret.
auth_secret = os.getenv("AUTH_SECRET") or os.getenv("NEXTAUTH_SECRET") or "secret"
jwt_decoder = NextAuthJWT(secret=auth_secret)

@router.get("/token")
def get_auth_token(request: Request):
    try:
        # Decrypt cookie using NextAuth JWE decryption
        jwt_data = jwt_decoder.get_jwt(request)
        if not jwt_data:
            return JSONResponse(status_code=401, content={"error": "Unauthorized"})
            
        # Extract the raw session JWE token string from cookies
        cookies = request.cookies
        cookie_name = "next-auth.session-token"
        if "__Secure-next-auth.session-token" in cookies:
            cookie_name = "__Secure-next-auth.session-token"
        raw_token = cookies.get(cookie_name, "")
        
        return {
            "jwt": raw_token,
            "user": {
                "id": jwt_data.get("sub"),
                "email": jwt_data.get("email"),
                "name": jwt_data.get("name")
            }
        }
    except Exception as e:
        print(f"Auth token retrieval failed in Python: {e}")
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

@router.get("/expo-web-success")
def expo_web_success(request: Request):
    try:
        jwt_data = jwt_decoder.get_jwt(request)
        if not jwt_data:
            raise Exception("Unauthorized")
            
        cookies = request.cookies
        cookie_name = "next-auth.session-token"
        if "__Secure-next-auth.session-token" in cookies:
            cookie_name = "__Secure-next-auth.session-token"
        raw_token = cookies.get(cookie_name, "")
        
        message = {
            "type": "AUTH_SUCCESS",
            "jwt": raw_token,
            "user": {
                "id": jwt_data.get("sub"),
                "email": jwt_data.get("email"),
                "name": jwt_data.get("name")
            }
        }
        
        html_content = f"""
        <html>
            <body>
                <script>
                    window.parent.postMessage({json.dumps(message)}, '*');
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content)
    except Exception as e:
        message = {"type": "AUTH_ERROR", "error": "Unauthorized"}
        html_content = f"""
        <html>
            <body>
                <script>
                    window.parent.postMessage({json.dumps(message)}, '*');
                </script>
            </body>
        </html>
        """
        return HTMLResponse(content=html_content, status_code=401)
