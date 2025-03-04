import os
from typing import Optional
from posthog import Posthog

# Initialize PostHog client
posthog_key = os.environ.get("POSTHOG_API_KEY")
posthog: Optional[Posthog] = None

if posthog_key:
    try:
        posthog = Posthog(posthog_key, host="https://us.i.posthog.com")
    except Exception as e:
        print(f"Failed to initialize PostHog: {e}")


def log_analysis_done(debugger: str, user_id: str, app_type: str, converted_to_docker: bool):
    """
    Log an event to PostHog when *PLOOMBER*CLOUD_ENV is set to "prod" and PostHog is initialized.

    Args:
    event_name (str): The name of the event to log.
    user_id (str): A unique ID to identify the user
    properties (dict, optional): Additional properties to include with the event.
    """
    if os.environ.get("_PLOOMBER_CLOUD_ENV", "prod").lower() == "prod" and posthog:
        event_name = f"DEBUGGER-APP-{debugger}"
        # Ensure properties is a dictionary
        properties = {"type": app_type, "converted_to_docker": converted_to_docker}
        # Capture the event
        try:
            posthog.capture(user_id, event_name, properties)
        except Exception as e:
            print(f"Failed to log event to PostHog: {e}")


def log_deployment_result(
    user_id: str, deploy_success: bool, app_type: str, converted_to_docker: bool
):
    if os.environ.get("_PLOOMBER_CLOUD_ENV", "prod").lower() == "prod" and posthog:
        event_name = "DEBUGGER-APP-REDEPLOY-TRIGGER"
        # Ensure properties is a dictionary
        properties = {
            "type": app_type,
            "converted_to_docker": converted_to_docker,
            "started_deployment_successfully": deploy_success,
        }
        # Capture the event
        try:
            posthog.capture(user_id, event_name, properties)
        except Exception as e:
            print(f"Failed to log event to PostHog: {e}")
