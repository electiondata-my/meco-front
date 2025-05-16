## Table of Contents

- [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Commands to Know](#commands-to-know)
- [Development Workflow](#development-workflow)
- [Contributing](#contributing)
- [License](#license)

## Installation

We recommend using `yarn` to manage the project's dependencies.

```sh
git clone git@github.com:electiondata-my/meco-front.git

# Yarn
yarn install
yarn prepare

# NPM
npm install
npx prepare

cp .env.example .env
```

### Environment Variables

The following are the environment variables (.env) used for electiondata.my.

| Variables                       | Required | Default                             | Description                                     |
| ------------------------------- | -------- | ----------------------------------- | ----------------------------------------------- |
| APP_URL                         | ⬜️       | http://localhost:3000 (development) | App domain. Optional                             |
| NEXT_PUBLIC_APP_URL             | ⬜️       | $APP_URL                            | App domain, made public. Optional                |

## Commands to Know

```bash
# Start development server
yarn dev

# Build production app
yarn build

# Start production server
yarn start

# Setup husky for githook
yarn prepare
```

## Development Workflow

1. Branch out from `staging` & give the new branch a descriptive name eg: `feat/election-dashboard`, `fix/dropdown-bug` etc.
2. After you're done, `git fetch && git merge origin/staging` to synchronize any new changes & resolve conflicts, if there is any.
3. Push the branch to remote and create a PR to `staging`. Briefly describe the changes introduced in the PR.
4. Assign a core developer to review and wait for it to be approved.
5. That's all. Happy developing!

## Contributing

Thank you for your willingness to contribute to this open source project dedicated to the public domain! When contributing, consider first discussing your desired change via GitHub issues or discussions. Happy coding!
