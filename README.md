## Table of Contents

- [Installation](#installation)
  - [Environment Variables](#environment-variables)
- [Commands to Know](#commands-to-know)
- [Contributing](#contributing)
- [License](#license)

## Installation

We recommend using `yarn` to manage the project's dependencies.

```sh
git clone git@github.com:electiondata-my/meco-front.git

# Yarn
yarn install
yarn prepare

cp .env.example .env
```

### Environment Variables

The following are the environment variables (.env) used for electiondata.my. ✅ indicates a required variable, while ⬜️ indicates an optional one. Unused variables are marked with 🪦.

| Variables                       | Required | Default                             | Description                                     |
| ------------------------------- | -------- | ----------------------------------- | ----------------------------------------------- |
| APP_URL                         | ⬜️       | https://electiondata.my             | Base app domain                                 |
| APP_ENV                         | ✅       | staging                             | Application environment                         |
| EDGE_CONFIG                     | ✅       | (private, get your own)            | Edge configuration settings                     |
| NEXT_PUBLIC_APP_URL            | ⬜️       | https://electiondata.my             | Public app domain                              |
| NEXT_PUBLIC_APP_ENV            | ✅       | staging                             | Public application environment                  |
| REVALIDATE_TOKEN               | ✅       | (private, get your own)            | Token for revalidating cache                    |
| NEXT_PUBLIC_API_URL_TB         | 🪦       | https://api.us-east.aws.tinybird.co/v0/pipes | Tinybird API endpoint; not used for now |
| NEXT_PUBLIC_API_TOKEN_TB       | 🪦       |  (private, get your own)            | Tinybird API access token                       |
| NEXT_PUBLIC_API_URL_S3         | ✅       | https://static.electiondata.my      | Static assets served via Cloudfront; no token needed             |
| NEXT_PUBLIC_I18N_URL           | ✅       | https://static.electiondata.my/i18n | i18n resources served via Cloudfront; no token needed     |

## Commands to Know

```bash
# Start development server
yarn dev

# Start production server
yarn start

# Build production app
yarn build

# Setup husky for githook
yarn prepare
```

## Contributing

Thank you for supporting this open source project dedicated to the public domain! When contributing, consider first opening an issue - so that everyone is on the same page. Happy coding!

## License

This project is released into the public domain under [CC0 1.0 Universal (CC0 1.0) Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/). You are free to use, modify, and distribute the code without any restrictions.
