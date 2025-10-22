> [!NOTE]
> Please prefer English language for all communication.

## Creating an issue

Before creating an issue please ensure that the problem is not [already reported](https://github.com/sc-localization/VerseBridge/issues).

## How to Contribute

1. **Fork and Clone the Repository**

   First, create your own copy of the repository by clicking the "Fork" button on GitHub. Then, clone your fork to your local machine:

   ```sh
   git clone https://github.com/sc-localization/lingvo-injector.git
   cd lingvo-injector
   ```

2. **Create a New Branch**

> [!NOTE]
> All development takes place in the **dev branch**. The main branch always contains only stable, release-ready code.

```sh
git checkout dev
git pull origin dev
git checkout -b feature/short-description
```

3. **Make Changes**
   Implement your feature or fix the bug. Be sure to follow the project's coding style and add tests if necessary.

4. **Commit Changes**

   ```sh
   git add .
   git commit -m "feat: add new super feature"
   ```

5. **Push Changes**

   ```sh
   git push -u origin feature/short-description
   ```

6. **Create a Pull Request**

   Once you've completed your work, create a Pull Request from your branch to the **dev branch**. Please ensure that your branch is up-to-date with the dev branch and that the Pull Request is targeted at the dev branch, not the main branch. Double-check the target branch before submitting the Pull Request.

7. **After Pull Request**

   ```sh
   git checkout dev
   git pull origin dev
   git branch -d feature/your-new-feature
   ```

## Commit messages

Commit messages should follow the [Conventional Commits](https://conventionalcommits.org) specification:

```
<type>[optional scope]: <description>
```

### Allowed `<type>`

- `chore`: any repository maintainance changes
- `feat`: code change that adds a new feature
- `fix`: bug fix
- `perf`: code change that improves performance
- `refactor`: code change that is neither a feature addition nor a bug fix nor a performance improvement
- `docs`: documentation only changes
- `ci`: a change made to CI configurations and scripts
- `style`: cosmetic code change
- `test`: change that only adds or corrects tests
- `revert`: change that reverts previous commits

If you have any questions or need help, feel free to open an issue or ask in the discussions section. We appreciate your contributions!
