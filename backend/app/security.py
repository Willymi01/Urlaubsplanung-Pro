import hashlib
import hmac
import secrets


def hash_pin(pin: str) -> str:
    """Hash a PIN with scrypt and a random salt."""
    salt = secrets.token_bytes(16)
    derived = hashlib.scrypt(
        pin.encode("utf-8"),
        salt=salt,
        n=2**14,
        r=8,
        p=1,
        dklen=32,
    )
    return f"scrypt${salt.hex()}${derived.hex()}"


def verify_pin(pin: str, stored: str) -> bool:
    try:
        algorithm, salt_hex, expected_hex = stored.split("$", 2)
        if algorithm != "scrypt":
            return False
        actual = hashlib.scrypt(
            pin.encode("utf-8"),
            salt=bytes.fromhex(salt_hex),
            n=2**14,
            r=8,
            p=1,
            dklen=32,
        )
        return hmac.compare_digest(actual.hex(), expected_hex)
    except (ValueError, TypeError):
        return False


def validate_pin(pin: str) -> tuple[bool, str]:
    if not pin.isdigit():
        return False, "Die PIN darf nur aus Ziffern bestehen."
    if not 4 <= len(pin) <= 8:
        return False, "Die PIN muss zwischen 4 und 8 Ziffern lang sein."
    if len(set(pin)) == 1:
        return False, "Bitte keine PIN mit ausschließlich gleichen Ziffern verwenden."
    return True, ""


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)
