# Prettier 代码风格指南

本项目使用 [Prettier](https://prettier.io/) 来统一代码风格。这确保了所有开发者在提交代码时都遵循相同的代码格式规范。

## 配置概述

Prettier 配置文件位于项目根目录下的 `.prettierrc.cjs`，主要配置包括：

- `printWidth: 100` - 每行代码最大长度为 100 个字符
- `tabWidth: 2` - 使用 2 个空格进行缩进
- `useTabs: false` - 使用空格而非制表符
- `semi: true` - 在语句末尾添加分号
- `singleQuote: true` - 使用单引号
- `jsxSingleQuote: true` - 在 JSX 中也使用单引号
- `trailingComma: 'es5'` - 在多行对象和数组中添加尾随逗号
- `arrowParens: 'always'` - 箭头函数参数始终使用括号

完整配置见 `.prettierrc.cjs` 文件。

## 使用方法

### 命令行格式化

可以使用以下命令格式化代码：

```bash
# 格式化所有文件
pnpm run format

# 检查代码是否符合格式规范（不进行修改）
pnpm run format:check
```

### 编辑器集成

本项目已配置 VSCode 设置，当安装了 Prettier 扩展后，将在保存文件时自动格式化代码。

如果你使用 VSCode，请安装 [Prettier - Code formatter](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) 扩展。

对于其他编辑器，请参考 [Prettier 官方文档](https://prettier.io/docs/en/editors.html)。

## ESLint 集成

本项目使用 `eslint-config-prettier` 以确保 ESLint 与 Prettier 不会有冲突的规则。ESLint 专注于代码质量规则，而 Prettier 负责代码格式化。

## 忽略格式化

如果需要忽略特定文件或目录的格式化，可以在 `.prettierignore` 文件中进行配置。

对于特定代码片段，可以使用以下注释：

```js
// prettier-ignore
const uglyCode = {a:1, b:2, c:3}
```

## 注意事项

- 提交代码前先运行 `pnpm format` 确保代码格式一致
- CI 流程中会检查代码格式，不符合规范的提交可能会被拒绝
- 当对格式有疑问时，请以 `.prettierrc.cjs` 配置为准
