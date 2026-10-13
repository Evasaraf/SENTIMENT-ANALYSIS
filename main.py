from fastapi import FASTAPI
app = FASTAPI()
@app.get("/")
def greet():
    return {"hello eva"}