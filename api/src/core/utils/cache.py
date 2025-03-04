
from functools import wraps
from time import time


def cache_with_timeout(timeout_seconds: int = 10):
    cache = {}
    
    def decorator(func):
        @wraps(func)
        async def wrapper(self):  # Remove job_id parameter here
            # Use self.job_id instead of job_id parameter
            job_id = self.job_id
            current_time = time()
            
            # Check if we have a cached result and it's still valid
            if job_id in cache:
                cached_time, cached_result = cache[job_id]
                if current_time - cached_time < timeout_seconds:
                    return cached_result
            
            # If no valid cache exists, call the original function
            result = await func(self)  # Remove job_id argument here
            cache[job_id] = (current_time, result)
            return result
            
        return wrapper
    return decorator

