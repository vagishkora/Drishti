from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    phone: str | None = None
    full_name: str | None = None

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class TOTPVerify(BaseModel):
    email: EmailStr
    totp_code: str
    