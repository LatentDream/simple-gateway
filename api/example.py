from fastapi import FastAPI, Response
from datetime import datetime
import uvicorn
from pydantic import BaseModel
import random

app = FastAPI(title="Example Service")

class Item(BaseModel):
    name: str
    value: int

@app.get("/api/service1/time")
async def get_time():
    """Returns current time"""
    return {
        "time": datetime.now().isoformat(),
        "service": "example-service-1"
    }

@app.get("/api/service1/random")
async def get_random():
    """Returns a random number"""
    return {
        "random": random.randint(1, 100),
        "service": "example-service-1"
    }

@app.post("/api/service1/echo")
async def echo_post(item: Item):
    """Echoes back the posted data"""
    return {
        "received": item.dict(),
        "service": "example-service-1",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/service1/slow")
async def slow_response():
    """Simulates a slow response"""
    import asyncio
    await asyncio.sleep(2)
    return {
        "message": "This was a slow response",
        "service": "example-service-1",
        "timestamp": datetime.now().isoformat()
    }

@app.get("/api/service1/headers")
async def custom_headers(response: Response):
    """Returns response with custom headers"""
    response.headers["X-Custom-Header"] = "test-value"
    return {
        "message": "Check the headers",
        "service": "example-service-1"
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8081) 