module.exports = {
  printWidth: 100, // 每行代码最大长度
  tabWidth: 2, // 缩进使用 2 个空格
  useTabs: false, // 使用空格而不是制表符进行缩进
  semi: true, // 在语句末尾使用分号
  singleQuote: true, // 使用单引号而不是双引号
  quoteProps: 'as-needed', // 仅在必要时为对象属性添加引号
  jsxSingleQuote: true, // 在 JSX 中使用单引号
  trailingComma: 'es5', // 在多行对象和数组的最后一项添加逗号
  bracketSpacing: true, // 在对象字面量的括号之间添加空格
  bracketSameLine: false, // 将多行 JSX 元素的 > 放在最后一行的末尾，而不是另起一行
  arrowParens: 'always', // 箭头函数参数始终使用圆括号
  htmlWhitespaceSensitivity: 'css', // 根据 CSS display 属性处理 HTML 空白敏感度
  endOfLine: 'lf', // 使用 LF 作为行尾序列
  embeddedLanguageFormatting: 'auto', // 自动格式化嵌入的代码块
  singleAttributePerLine: false, // 不强制每行只有一个 JSX 属性
  overrides: [
    {
      // 为特定文件类型指定不同的配置
      files: '*.{json,yml,yaml,md}',
      options: {
        tabWidth: 2,
      },
    },
  ],
};
