# Debugger Backend

## Setup Instructions

## Development

The enviroment has currently three dependencies:
```sh
sudo apt-get just
curl -sSL https://install.python-poetry.org | python3 -
```

1. Activate the debugger environment:
   ```sh
   poetry shell
   poetry install
   ```

3. Run the dev build with [`Just`](https://github.com/casey/just):
   ```sh
   just dev
   curl http://localhost:8000/admin/healthcheck
   ```


To run the final dev|prod build from a Docker container:
   ```sh
   just build
   just preview {DEV|PROD}
   curl http://localhost:552/admin/healthcheck
   ```

## Testing
1. Run the full test suite
   ```sh
   just tests
   ```

2. Run specific test(s) with full logs based on a grepping pattern 
   ```sh
   just test {test_name_pattern}
   ```

3. Run test coverage
   ```sh
   just test-coverage
   ```

# Deploying

Make sure to test the final build with:
```sh
just build
just preview {DEV|PROD}
```
- This will automatically convert Poetry env to a valid `requirements.txt`

```sh
just deploy
```

# Database

This project currently uses SQLite, see [Database README.md](./src/database/migrations/README).
- Only one instance of the API is deployed
- Postgres can be used for persistence of the data between restarts, or for API replication, but there is no need for it at the moment
   - No Postgres & migration process for Postgres has been implemented (beside alembic)
