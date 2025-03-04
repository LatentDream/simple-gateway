import json
import aiofiles
import os
from typing import Any, final
import httpx
from fastapi import HTTPException, status

from src.schema.cloud import JobLogsResponse, Project, ProjectType, ProjectsResponse
from src.services.auth.middleware import PloomberAuth
from src.settings import Settings

@final
class PlatformClient:
    """Async client for the Ploomber Cloud API"""
    def __init__(
        self,
        auth: PloomberAuth,
        api_url: str,
        timeout: int = 30,
    ):
        self.auth = auth
        self.api_url = api_url
        self.timeout = timeout

    def _get_headers(self) -> dict[str, str]:
        return self.auth.get_headers()

    async def _process_response(self, response: httpx.Response) -> dict[Any, Any]:
        """Process response and raise an exception if the status code is not 200"""
        if response.status_code == status.HTTP_200_OK:
            return response.json()
        
        if response.status_code == status.HTTP_500_INTERNAL_SERVER_ERROR:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error occurred"
            )

        error_message = response.json().get("detail", "Unknown error occurred")
        if response.status_code == status.HTTP_404_NOT_FOUND:
            error_message = f"Application not found"
            
        raise HTTPException(
            status_code=response.status_code,
            detail=f"An error occurred: {error_message}"
        )

    async def me(self) -> dict[str, Any]:
        """Return information about the current user"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.api_url}/users/me",
                headers=self._get_headers(),
            )
            return await self._process_response(response)

    async def get_projects(self) -> ProjectsResponse:
        """Return user's current projects"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.api_url}/projects",
                headers=self._get_headers(),
            )
            json_data = await self._process_response(response)
            return ProjectsResponse(**json_data)

    async def get_project_by_id(self, id: str) -> Project:
        """Return a specific project by ID"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.api_url}/projects/{id}",
                headers=self._get_headers(),
            )
            json_data = await self._process_response(response)
            return Project(**json_data)

    async def get_job_logs_by_id(self, id: str) -> JobLogsResponse:
        """Return docker logs and webservice logs by job id"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.api_url}/jobs/{id}/logs",
                headers=self._get_headers(),
            )
        json_data = await self._process_response(response)
        return JobLogsResponse(**json_data)

    async def create_project(self, project_type: str) -> dict[str, Any]:
        """Create a new project"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(
                f"{self.api_url}/projects/{project_type}",
                headers=self._get_headers(),
            )
            return await self._process_response(response)

    async def deploy_project(
        self,
        path_to_zip: str,
        project_type: str,
        project_id: str,
        secrets: dict[str, Any] | None = None,
        resources: dict[str, Any] | None = None,
        template: str | None = None,
        labels: dict[str, str] | None = None,
    ) -> dict[str, Any]:
        """Deploy a project"""
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            with open(path_to_zip, "rb") as file:
                files = {
                    "files": (
                        "app.zip",
                        file,
                        "application/zip",
                    ),
                }
                data = {
                    k: v for k, v in {
                        "secrets": secrets,
                        "resources": resources,
                        "template": template,
                        "labels": labels,
                    }.items() if v is not None
                }
                
                response = await client.post(
                    f"{self.api_url}/projects/{project_type}/{project_id}/deploy",
                    headers=self._get_headers(),
                    files=files,
                    data=data,
                )
                return await self._process_response(response)


    async def get_file(self, project_id: str) -> Any:
        """
        Download project files as a stream of bytes.
        Yields:
            bytes: Chunks of the file content
        Raises:
            HTTPException: If the download fails
        """
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(
                f"{self.api_url}/jobs/{project_id}/files",
                headers=self._get_headers(),
                follow_redirects=True
            )
            
            if response.status_code != status.HTTP_200_OK:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Failed to download files for project {project_id}"
                )
            
            async for chunk in response.aiter_bytes():
                yield chunk

    async def deploy(
        self,
        project_type: ProjectType,
        path_to_zip: str,
        project_id: str | None = "new",
        secrets: list[dict[str, str]] | None = None,
        authentication: str | None = None,
        authentication_analytics: str | None = None,
        carry_over_auth: bool = False,
        carry_over_auth_analytics: bool = False,
        carry_over_files: bool = False,
        example_id: str | None = None,
        labels: list[str] | None = None,
        cpu: float | str = 0.5,
        ram: float | str = 1,
        gpu: float | str = 0,
        storage: int | str = 0,
        project_name: str | None = None,
        template: str | None = None,
    ) -> dict[str, Any]:
        """Deploy a project as a web service
        
        Args:
            project_type: Type of the project to deploy
            path_to_zip: Path to the zip file containing the project
            project_id: ID of the project (default: "new" for new projects)
            secrets: Dictionary of secrets to pass to the project
            authentication: Authentication configuration
            authentication_analytics: Authentication configuration for analytics
            carry_over_auth: Whether to carry over authentication
            carry_over_auth_analytics: Whether to carry over analytics authentication
            carry_over_files: Whether to carry over files
            example_id: ID of the example to use
            labels: Dictionary of labels to apply to the project
            cpu: CPU allocation (default: 0.5)
            ram: RAM allocation in GB (default: 1)
            gpu: Number of GPUs (default: 0)
            storage: Storage allocation in GB (default: 0)
            project_name: Name of the project
            template: Template to use for deployment
        
        Returns:
            dict: Response from the API
        """
        if not os.path.exists(path_to_zip):
            raise FileNotFoundError(f"Zip file not found at path: {path_to_zip}")

        form_data = {
            "project_id": project_id,
            "secrets": json.dumps(secrets) if secrets else "[]",
            "authentication": json.dumps(authentication) if authentication else None,
            "authentication_analytics": json.dumps(authentication_analytics) if authentication_analytics else None,
            "carry_over_auth": carry_over_auth if carry_over_auth else None,
            "carry_over_auth_analytics": carry_over_auth_analytics if carry_over_auth_analytics else None,
            "carry_over_files": carry_over_files,
            "example_id": example_id,
            "labels": json.dumps(labels) if labels else None,
            "cpu": str(cpu),
            "ram": str(ram),
            "gpu": str(gpu),
            "storage": str(storage),
            "project_name": project_name,
            "template": template,
        }
        # Remove None values
        form_data = {k: v for k, v in form_data.items() if v is not None}

        async with aiofiles.open(path_to_zip, 'rb') as file:
            file_content = await file.read()
            files = {"files": ("app.zip", file_content, "application/zip")}
            url = f"{self.api_url}/jobs/webservice/{project_type}"
            if project_id:
                url += f"?project_id={project_id}"
            
            async with httpx.AsyncClient(timeout=30) as client:
                headers = self.auth.get_headers({})
                response = await client.post(
                    url,
                    headers=headers,
                    files=files,
                    data=form_data,
                )
            return await self._process_response(response)
