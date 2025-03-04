# Debugger Backend

## Setup Instructions

## Development

The enviroment has currently three dependencies:
```sh
sudo apt-get tree       # Mandatory
sudo apt-get just       # CMD runner (CMD can be run mannual (look in `Justfile` for the cmd))
curl -sSL https://install.python-poetry.org | python3 - # Python Env
```

1. Activate the debugger environment:
   ```sh
   poetry shell
   poetry install
   ```

2. Start Redis & the background Worker
   ```sh
   export OPENAI_API_KEY=...
   just dev-worker
   ```

3. Run the dev build with [`Just`](https://github.com/casey/just):
   ```sh
   export OPENAI_API_KEY=...
   just dev
   ```


To run the final dev|prod build from a Docker container:
   ```sh
   just build
   just preview {DEV|PROD} {openai_api_key_value}
   ```

## Testing
1. Run the full test suite (without the one for the AI Agent)
   ```sh
   just tests
   ```

2. Run the AI Agent tests (You'll need an API key)
   ```sh
   jsut tests-ai
   ```

3. Run specific test(s) with full logs based on a grepping pattern 
   ```sh
   just test {test_name_pattern}
   ```

4. Run test coverage
   ```sh
   just test-coverage
   ```

# Installing dependencies

Make sure to test the final build with:
```sh
just build
just preview {DEV|PROD} {openai_api_key_value}
```
- This will automatically convert Poetry env to a valid `requirements.txt`

# Database

This project currently uses SQLite, see [Database README.md](./src/database/migrations/README).
- Only one instance of the API is deployed
- Postgres can be used for persistence of the data between restarts, or for API replication, but there is no need for it at the moment
   - No Postgres & migration process for Postgres has been implemented (beside alembic)
