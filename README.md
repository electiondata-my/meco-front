## Table of Contents

- [License](#license)
- [Installation](#installation)
- [Commands to Know](#commands-to-know)
- [Contributing](#contributing)

## License

In the name of democracy, this project is released into the public domain under [CC0 1.0 Universal (CC0 1.0) Public Domain Dedication](https://creativecommons.org/publicdomain/zero/1.0/). You are free to use, modify, and distribute the code without any restrictions.

## Installation

We recommend using `pnpm` to manage the project's dependencies.

The following environment variables (.env) are used for electiondata.my.

- ✅ indicates a required variable (meaning, core features won't work without these)
- ⬜️ indicates an optional variable (only affects non-core features)
- 🪦 indicates an unused variables (which may be used in future)

| Variables                       | Required | Default                                      | Description                                                   |
| ------------------------------- | -------- | -------------------------------------------- | ------------------------------------------------------------- |
| APP_URL                         | ⬜️       | https://electiondata.my                      | Base app domain                                               |
| APP_ENV                         | ✅       | staging                                      | Application environment                                       |
| EDGE_CONFIG                     | ✅       | (private, get your own)                      | Edge configuration settings                                   |
| NEXT_PUBLIC_APP_URL             | ⬜️       | https://electiondata.my                      | Public app domain                                             |
| NEXT_PUBLIC_APP_ENV             | ✅       | staging                                      | Public application environment                                |
| REVALIDATE_TOKEN                | ✅       | (private, get your own)                      | Token for revalidating cache                                  |                   |                                   |
| NEXT_PUBLIC_API_URL_S3          | ✅       | https://static.electiondata.my               | Static assets served via Cloudfront; no token needed          |
| NEXT_PUBLIC_I18N_URL            | ✅       | https://static.electiondata.my/i18n          | i18n resources served via Cloudfront; no token needed         |
| NEXT_PUBLIC_TINYBIRD_TOKEN      | ⬜️       | (private, get your own)                      | Token for updating and reading viewcounts in Tinybird                     |            |
| NEXT_PUBLIC_MAPBOX_ACCOUNT      | ✅       | (private, get your own)                      | Mapbox account ID; map features won't work without this       |
| NEXT_PUBLIC_MAPBOX_TOKEN        | ✅       | (private, get your own)                      | Mapbox API access token; map features won't work without this |

## Commands to Know

```bash
# Start development server
pnpm dev

# Build production app
pnpm build
```

## Contributing

Thank you for supporting this open source project dedicated to the public domain! When contributing, consider first opening an issue - so that everyone is on the same page. Happy coding!
