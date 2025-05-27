# Contributing to MorseFlash

We love your input! We want to make contributing to MorseFlash as easy and transparent as possible, whether it's:

- Reporting a bug
- Discussing the current state of the code
- Submitting a fix
- Proposing new features
- Becoming a maintainer

## Development Process

We use GitHub to host code, to track issues and feature requests, as well as accept pull requests.

1. Fork the repo and create your branch from `main`.
2. If you've added code that should be tested, add tests.
3. If you've changed APIs, update the documentation.
4. Ensure the test suite passes.
5. Make sure your code lints.
6. Issue that pull request!

## Code Style

- Use TypeScript for all new code
- Follow the existing code style
- Use ESLint and Prettier for code formatting
- Write meaningful commit messages

## Project Structure

```
morseFlash_RN_CLI/
├── android/          # Android native code
├── ios/             # iOS native code
├── components/      # Reusable React components
├── views/          # Screen components
├── utils/          # Helper functions and utilities
├── specs/          # Native module specifications
└── __tests__/      # Test files
```

## Setting Up Development Environment

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. For iOS development:
   ```bash
   bundle install
   bundle exec pod install --project-directory=ios
   ```
4. Start Metro:
   ```bash
   npm start
   ```
5. Run the app:

   ```bash
   # For iOS
   npm run ios

   # For Android
   npm run android
   ```

## Testing

- Run tests with: `npm test`
- Add new tests in the `__tests__` directory
- Ensure all tests pass before submitting a PR

## License

By contributing, you agree that your contributions will be licensed under the project's license.

## Questions?

Feel free to open an issue for any questions or concerns.
