# Contributing to GEO Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to the project.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Help others learn and grow

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/geo-platform.git`
3. Create a new branch: `git checkout -b feature/your-feature-name`
4. Make your changes
5. Run tests: `bash test-integration.sh`
6. Commit with clear messages: `git commit -m 'Add feature description'`
7. Push and create a Pull Request

## Development Setup

```bash
# Install dependencies
cd backend-new && npm install
cd ../GEO && npm install

# Start development servers
# Terminal 1: Backend
cd backend-new && npm run dev

# Terminal 2: Frontend
cd GEO && npm run dev

# Terminal 3: Tests
cd backend-new && bash test-integration.sh
```

## Code Style

- Use TypeScript strict mode
- Follow existing code patterns
- Use meaningful variable/function names
- Add comments for complex logic
- Run linting before committing

## Commit Messages

Use clear, descriptive commit messages:
- ✨ feat: Add new feature
- 🐛 fix: Fix a bug
- 📖 docs: Update documentation
- ♻️ refactor: Refactor code
- ✅ test: Add tests
- 🚀 chore: Update dependencies

Example: `✨ feat: Add user profile creation endpoint`

## Testing

All contributions must include:
- ✅ Integration tests passing
- ✅ No TypeScript errors
- ✅ No console errors

Run tests:
```bash
bash test-integration.sh
bash verify-deployment.sh
```

## Pull Request Process

1. Update README if needed
2. Update documentation
3. Ensure tests pass
4. Provide clear PR description
5. Link related issues if applicable

## Issues

Found a bug? Create an issue with:
- Clear title
- Description of problem
- Steps to reproduce
- Expected vs actual behavior
- Your environment (OS, Node version, etc.)

## Questions?

- 📖 Check [README_DEPLOYMENT.md](../README_DEPLOYMENT.md)
- 📖 See [SERVICE_MODULES_GUIDE.md](../SERVICE_MODULES_GUIDE.md)
- 💬 Create a discussion for questions

---

Thank you for contributing to GEO! 🎉
