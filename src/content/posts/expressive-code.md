---
title: Expressive Code 代码块示例
published: 2024-04-10
description: 演示在 Markdown 中使用 Expressive Code 渲染代码块的各种样式与功能。
tags: [Markdown, 博客, 演示]
category: 示例
lang: zh_CN
draft: false
---

在本文中，我们将探索如何使用 [Expressive Code](https://expressive-code.com/) 渲染丰富多样的代码块效果。以下示例基于官方文档编写，可以参考其官方文档获取更多详细信息。

## Expressive Code 核心特性

### 语法高亮

[语法高亮文档](https://expressive-code.com/key-features/syntax-highlighting/)

#### 常规语法高亮

```js
console.log('这段代码已应用语法高亮！')
```

#### 渲染 ANSI 转义序列

```ansi
ANSI 颜色：
- 常规:  [31m红色[0m  [32m绿色[0m  [33m黄色[0m  [34m蓝色[0m  [35m品红[0m  [36m青色[0m
- 粗体:  [1;31m红色[0m  [1;32m绿色[0m  [1;33m黄色[0m  [1;34m蓝色[0m  [1;35m品红[0m  [1;36m青色[0m
- 暗淡:  [2;31m红色[0m  [2;32m绿色[0m  [2;33m黄色[0m  [2;34m蓝色[0m  [2;35m品红[0m  [2;36m青色[0m

256 色模式 (展示颜色 160-177)：
 [38;5;160m160  [38;5;161m161  [38;5;162m162  [38;5;163m163  [38;5;164m164  [38;5;165m165[0m
 [38;5;166m166  [38;5;167m167  [38;5;168m168  [38;5;169m169  [38;5;170m170  [38;5;171m171[0m
 [38;5;172m172  [38;5;173m173  [38;5;174m174  [38;5;175m175  [38;5;176m176  [38;5;177m177[0m

完整 RGB 颜色：
 [38;2;34;139;34m森林绿 - RGB(34, 139, 34)[0m

文本排版样式：  [1m粗体[0m  [2m暗淡[0m  [3m斜体[0m  [4m下划线[0m
```

### 编辑器与终端边框

[边框配置文档](https://expressive-code.com/key-features/frames/)

#### 代码编辑器边框

```js title="my-test-file.js"
console.log('通过 title 属性指定文件名的示例')
```

---

```html
<!-- src/content/index.html -->
<div>通过首行注释指定文件名的示例</div>
```

#### 终端边框

```bash
echo "这是一个没有标题的终端边框"
```

---

```powershell title="PowerShell 终端示例"
Write-Output "这是一个带标题的终端边框！"
```

#### 覆盖边框类型

```sh frame="none"
echo "无边框模式展示！"
```

---

```ps frame="code" title="PowerShell Profile.ps1"
# 如果不覆盖，默认会渲染为终端边框
function Watch-Tail { Get-Content -Tail 20 -Wait $args }
New-Alias tail Watch-Tail
```

### 文本与行标记

[标记功能文档](https://expressive-code.com/key-features/text-markers/)

#### 标记整行与指定行范围

```js {1, 4, 7-8}
// 第 1 行 - 通过行号精准标记
// 第 2 行
// 第 3 行
// 第 4 行 - 通过行号精准标记
// 第 5 行
// 第 6 行
// 第 7 行 - 通过范围 "7-8" 标记
// 第 8 行 - 通过范围 "7-8" 标记
```

#### 指定行标记类型

```js title="line-markers.js" del={2} ins={3-4} {6}
function demo() {
  console.log('此行被标记为已删除')
  // 此行与下一行被标记为已插入
  console.log('这是第二行插入的内容')

  return '此行使用中立的默认高亮标记'
}
```

#### 为行标记添加标签文本

```jsx {"1":5} del={"2":7-8} ins={"3":10-12}
// labeled-line-markers.jsx
<button
  role="button"
  {...props}
  value={value}
  className={buttonClassName}
  disabled={disabled}
  active={active}
>
  {children &&
    !active &&
    (typeof children === 'string' ? <span>{children}</span> : children)}
</button>
```

#### 在单独行展示长文本标签

```jsx {"1. 在此处传入 value 属性:":5-6} del={"2. 移除 disabled 与 active 状态:":8-10} ins={"3. 添加此逻辑以在按钮内渲染 children:":12-15}
// labeled-line-markers.jsx
<button
  role="button"
  {...props}

  value={value}
  className={buttonClassName}

  disabled={disabled}
  active={active}
>

  {children &&
    !active &&
    (typeof children === 'string' ? <span>{children}</span> : children)}
</button>
```

#### 使用类 Diff 语法

```diff
+此行将被标记为新增插入
-此行将被标记为已删除
这是一行普通的未修改代码
```

---

```diff
--- a/README.md
+++ b/README.md
@@ -1,3 +1,4 @@
+这是一个真实的 diff 文件内容
-所有内容保持原样不修改
 也不会移除任何空白字符
```

#### 结合语法高亮与 Diff 语法

```diff lang="js"
  function thisIsJavaScript() {
    // 整个代码块按 JavaScript 进行语法高亮，
    // 同时仍然支持添加 diff 差异标记！
-   console.log('待移除的旧代码')
+   console.log('全新且优美的新代码！')
  }
```

#### 标记行内指定文本

```js "given text"
function demo() {
  // 标记行内的指定文本内容
  return 'Multiple matches of the given text are supported';
}
```

#### 正则表达式匹配标记

```ts /ye[sp]/
console.log('包含 yes 和 yep 的单词将会被自动标记匹配。')
```

#### 转义正斜杠

```sh /\/ho.*\//
echo "Test" > /home/test.txt
```

#### 选择行内标记类型

```js "return true;" ins="inserted" del="deleted"
function demo() {
  console.log('这里展示了 inserted 与 deleted 行内标记类型');
  // return 语句使用默认标记类型
  return true;
}
```

### 自动换行

[自动换行文档](https://expressive-code.com/key-features/word-wrap/)

#### 单独配置代码块的自动换行

```js wrap
// 开启换行示例
function getLongString() {
  return '这是一段非常长的字符串内容，除非容器宽度极为充裕，否则在没有自动换行时会超出可用显示区域'
}
```

---

```js wrap=false
// 关闭换行示例
function getLongString() {
  return '这是一段非常长的字符串内容，除非容器宽度极为充裕，否则在没有自动换行时会超出可用显示区域'
}
```

#### 配置换行后的缩进保持

```js wrap preserveIndent
// 保持缩进示例
function getLongString() {
  return '这是一段非常长的字符串内容，除非容器宽度极为充裕，否则在没有自动换行时会超出可用显示区域'
}
```

---

```js wrap preserveIndent=false
// 不保持缩进示例
function getLongString() {
  return '这是一段非常长的字符串内容，除非容器宽度极为充裕，否则在没有自动换行时会超出可用显示区域'
}
```

## 可折叠代码区域

[代码折叠插件文档](https://expressive-code.com/plugins/collapsible-sections/)

```js collapse={1-5, 12-14, 21-24}
// 所有这部分前置样板设置代码将被默认折叠
import { someBoilerplateEngine } from '@example/some-boilerplate'
import { evenMoreBoilerplate } from '@example/even-more-boilerplate'

const engine = someBoilerplateEngine(evenMoreBoilerplate())

// 这部分核心业务代码默认可见
engine.doSomething(1, 2, 3, calcFn)

function calcFn() {
  // 可以配置多个折叠区间
  const a = 1
  const b = 2
  const c = a + b

  // 这行日志将保持可见
  console.log(`计算结果: ${a} + ${b} = ${c}`)
  return c
}

// 直到代码块结尾的这部分收尾代码将被再次折叠
engine.closeConnection()
engine.freeMemory()
engine.shutdown({ reason: '样板代码示例结束' })
```

## 行号显示

[行号插件文档](https://expressive-code.com/plugins/line-numbers/)

### 按代码块控制是否显示行号

```js showLineNumbers
// 此代码块将显示行号
console.log('来自第 2 行的问候！')
console.log('我现在处于第 3 行')
```

---

```js showLineNumbers=false
// 此代码块显式禁用了行号
console.log('有人在吗？')
console.log('抱歉，你知道我现在处于哪一行吗？')
```

### 修改起始行号

```js showLineNumbers startLineNumber=5
console.log('来自第 5 行的问候！')
console.log('我现在处于第 6 行')
```
