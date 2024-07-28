# Changelog

## 2.1.1 (2024-07-28)

- Fix: Runtime 404 in production. BASE_URL was not
  properly set as basename for production.
- Fix: metric query parameters led to multiple errors.
  Now values are verified before setting them and
  rely back on internal state.
- Show current version in the footer

## 2.1.0 (2024-07-28)

- Symlog scale to represent negative values logaritmically
- Metric selection state as query params. Copy url to share
  a given setup.
- Metric selection state simplified

## 2.0.0 (2024-07-28)

- First version after migrating from Mithril/MDC to React/MUI
- Som Energia themed including dark version
- More consitent responsive layout
- Nicer play buttons
- Loading and error panels with fireflies
- Fixed many glitches
- Updated to new team culture practices:
    - Componentization, use of libraries
    - Common script layout


