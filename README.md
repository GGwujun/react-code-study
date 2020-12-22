[TOC]

工欲善其事，必先利其器。

在学习 raect 源码时，如果能够在浏览器中单步调试，势必会加深理解。其实可以借助 webpack 的 resolve.alias 将 react 等指向本地的目录，这样就不会使用 node_modules 中的 react 包。
从而可以在本地调试 react 源码。

### 本地调试 react 源码步骤

#### 1. 生成 react 项目

可以直接基于 react cra cli 生成项目，也可以自己基于 react,webpack 搭建环境，具体可以参考https://github.com/bozhouyongqi/react-redux-demo项目。下述主要针对使用cra的项目。

#### 2. yarn run eject 暴露出 webpack 配置

这一步没有没什么，可以看到会生成 config 目录，里面包括 webpack 的配置文件和一些环境定义。但是很不幸，运行 yarn run start 会编译失败。出现下述错误。

```
Failed to compile.

./src/index.js
Error: [BABEL] /xxx/debug-react-new/src/index.js: Cannot find module '@babel/plugin-syntax-jsx' (While processing: "xxx/debug-react-new/node_modules/babel-preset-react-app/index.js")
```

意思是缺少@babel/plugin-syntax-jsx 这个模块，那直接安装就行。

```
yarn add @babel/plugin-syntax-jsx -D
```

之后再运行，就可以顺利启动项目了。

```
Compiled successfully!

You can now view debug-react-new in the browser.

  Local:            http://localhost:3000
  On Your Network:  http://192.168.0.103:3000

Note that the development build is not optimized.
To create a production build, use yarn build.
```

#### 3.清理 src 目录

删除测试以及其他文件，只保留 App 等业务组件。并去除相关引用。

#### 4.clone react 源码至 src 目录下

这里使用 git submodule 命令引入 react 源码作为子模块，以方便后续代码单独管理。

进入 src 目录，执行 git submodule add git@github.com:facebook/react.git。

克隆之后，就可以在 src/react 中正常切换分支，而不影响主工程。我这里使用 v16.13.1 版本，因此可以切换至具体的 tag.

git checkout tags/v16.13.1 -b v16.13.1

#### 5.修改 webpack.config.js 添加 alias 配置

注释掉原先的 alias 配置，添加新的，将 react 等指向本地

```
alias: {
    'react': path.resolve(__dirname, '../src/react/packages/react'),
    'react-dom': path.resolve(__dirname, '../src/react/packages/react-dom'),
    'shared': path.resolve(__dirname, '../src/react/packages/shared'),
    'react-reconciler': path.resolve(__dirname, '../src/react/packages/react-reconciler'),
    "legacy-events": path.resolve(__dirname, "../src/react/packages/legacy-events"),
    // 'react-events': path.resolve(__dirname, '../src/react/packages/events'),
    // scheduler: path.resolve(__dirname, "../src/react/packages/scheduler"),
},
```

然后再运行项目，发现会出现如下错误。

```
Failed to compile.

./src/packages/react-reconciler/src/ReactFiberDeprecatedEvents.js
Attempted import error: 'DEPRECATED_mountResponderInstance' is not exported from './ReactFiberHostConfig'.
```

#### 6.修改 ReactFiberHostConfig 文件

修改成如下

```
// We expect that our Rollup, Jest, and Flow configurations
// always shim this module with the corresponding host config
// (either provided by a renderer, or a generic shim for npm).
//
// We should never resolve to this file, but it exists to make
// sure that if we *do* accidentally break the configuration,
// the failure isn't silent.

// invariant(false, 'This module must be shimmed by a specific renderer.');

export * from './forks/ReactFiberHostConfig.dom';
```

从注释中可以看出，这个文件实际上 react 并不会直接引入，会被打包工具依赖相应的宿主环境替换掉。

之后再启动项目，发现会报如下错误

```
Failed to compile.

./src/index.js
Attempted import error: 'react' does not contain a default export (imported as 'React').
```

#### 7.修改 react 引用方式

出现上述错误，到源码中查看源码，发现/debug-react-new/src/packages/react/index.js 中确实没有默认导出。但是必须保证业务组件中要引入 React，因为组件需要用 babel-jsx 插件进行转换(即使用 React.createElement 方法)。因此可以添加一个中间模块文件，来适配该问题。

adaptation.js

```
import * as React from 'react';
import * as ReactDOM from 'react-dom';

export {
    React,
    ReactDOM
};
```

之后在业务组件中从 adaptation 引入 React 和 ReactDOM。

这一步之后，还是会出现新错误。

```
Failed to compile.

Failed to load config "fbjs" to extend from.
Referenced from: /xxx/baidu/learn/debug-react-new/src/react/.eslintrc.js
```

#### 8.关闭 ESlint 对 fbjs,prettier 插件的扩展

清空 react 源码项目下.eslintrc 文件中的 extends 选项

```
extends: [
    'fbjs',
    'prettier'
  ],
改为extends:[]
```

依然会继续报错:

```
Failed to compile.

Failed to load plugin 'no-for-of-loops' declared in 'src/react/.eslintrc.js': Cannot find module 'eslint-plugin-no-for-of-loops'
Require stack:
- /xxx/learn/debug-react-new/config/__placeholder__.js
```

#### 9.安装 eslint-plugin-no-for-of-loops 插件

yarn add eslint-plugin-no-for-of-loops -D

继续报错：

```
Failed to compile.

./src/react/packages/react-reconciler/src/ReactFiberWorkLoop.js
Attempted import error: 'unstable_flushAllWithoutAsserting' is not exported from 'scheduler' (imported as 'Scheduler').
```

#### 10.修改 scheduler/index.js 文件

/src/react/packages/scheduler/index.js 修改为

```
'use strict';

export * from './src/Scheduler';

//添加以下
export {
    unstable_flushAllWithoutAsserting,
    unstable_flushNumberOfYields,
    unstable_flushExpired,
    unstable_clearYields,
    unstable_flushUntilNextPaint,
    unstable_flushAll,
    unstable_yieldValue,
    unstable_advanceTime
} from './src/SchedulerHostConfig.js';
```

react/packages/scheduler/src/SchedulerHostConfig.js 修改为

```

// throw new Error('This module must be shimmed by a specific build.');

// 添加以下
export {
    unstable_flushAllWithoutAsserting,
    unstable_flushNumberOfYields,
    unstable_flushExpired,
    unstable_clearYields,
    unstable_flushUntilNextPaint,
    unstable_flushAll,
    unstable_yieldValue,
    unstable_advanceTime
  } from './forks/SchedulerHostConfig.mock.js';

  export {
    requestHostCallback,
    requestHostTimeout,
    cancelHostTimeout,
    shouldYieldToHost,
    getCurrentTime,
    forceFrameRate,
    requestPaint
  } from './forks/SchedulerHostConfig.default.js';
```

继续出现错误

```
Failed to compile.

Failed to load plugin 'react-internal' declared in 'src/react/.eslintrc.js': Cannot find module 'eslint-plugin-react-internal'
Require stack:
- /xxx/learn/debug-react-new/config/__placeholder__.js
```

#### 11.解决 react-internal 错误

这是 react 在本地安装的，在源码的 package 中可以看到。但是安装之后依然会报错，这里决定删除这个插件，不进行安装。在 debug-react-new/src/react/.eslintrc.js 中的 plugins 中将其删除。

下面是安装本地 react-internals。笔者这里没有安装，直接不使用该插件。

```
yarn add link:./src/react/scripts/eslint-rules -D
```

删除这个插件之后，还是报错：

```
Failed to compile.

./src/index.js
Module not found: Can't resolve 'react/jsx-dev-runtime' in '/xxx/learn/debug-react-new/src'
```

> 8-11 中的错误都是 react eslint 中的错误，可以试试在 webpack.config.js 中删除 eslint 插件。

#### 12.修复 react/jsx-dev-runtime 报错

在 webpack-config.js 中可以看到 hasJsxRuntime 变量的取值过程，直接在函数中返回 false.

修改完之后，会报一些 react-internal 有关的错误。

```
Line 1:1:  Definition for rule 'react-internal/no-to-warn-dev-within-to-throw' was not found  react-internal/no-to-warn-dev-within-to-throw
  Line 1:1:  Definition for rule 'react-internal/invariant-args' was not found                  react-internal/invariant-args
  Line 1:1:  Definition for rule 'react-internal/warning-args' was not found                    react-internal/warning-args
  Line 1:1:  Definition for rule 'react-internal/no-production-logging' was not found           react-internal/no-production-logging

src/react/packages/react-dom/src/shared/validAriaProperties.js
  Line 1:1:  Definition for rule 'react-internal/no-primitive-constructors' was not found       react-internal/no-primitive-constructors
  Line 1:1:  Definition for rule 'react-internal/no-to-warn-dev-within-to-throw' was not found  react-internal/no-to-warn-dev-within-to-throw
  Line 1:1:
```

可以到/xxx/learn/debug-react-new/src/react/.eslintrc.js 中将 react-internal 相关的规则都注释掉。

可以看到会继续报如下错误：

```
Failed to compile.

src/react/packages/react-dom/src/client/ReactDOM.js
  Line 241:9:  Definition for rule 'react-internal/no-production-logging' was not found  react-internal/no-production-logging

src/react/packages/react-reconciler/src/ReactFiberHostConfig.js
  Line 10:1:  Definition for rule 'react-internal/invariant-args' was not found  react-internal/invariant-args
  Line 12:8:  'invariant' is defined but never used                              no-unused-vars

src/react/packages/react-reconciler/src/ReactFiberReconciler.js
  Line 584:7:  Definition for rule 'react-internal/no-production-logging' was not found  react-internal/no-production-logging

```

可以到对应的文件中将 eslint 注释删除掉。

至此，命令行中不会报错误了。但是浏览器中会报错误，提示**DEV**没有定义。这个简单了，在 DefinePlugin 中定义就行。

#### 13.设置 DefinePlugin 插件

在/xxx/learn/debug-react-new/config/env.js 中添加:

```
const stringified = {
    'process.env': Object.keys(raw).reduce((env, key) => {
      env[key] = JSON.stringify(raw[key]);
      return env;
    }, {}),
    "__DEV__": true,
    "__PROFILE__": true,
    "__UMD__": true,
    "__EXPERIMENTAL__": true
};
```

浏览器中还是会报错：

```
Uncaught Error: Internal React error: invariant() is meant to be replaced at compile time. There is no runtime version.
```

#### 14.修改 invariant.js

/xxx/debug-react-new/src/react/packages/shared/invariant.js

```
export default function invariant(condition, format, a, b, c, d, e, f) {

    if (condition) {
        return;
    }
  throw new Error(
    'Internal React error: invariant() is meant to be replaced at compile ' +
      'time. There is no runtime version.',
  );
}
```

至此，大功告成，终于没有错误了。后面就可以针对源码进行断点调试或者打日志了。

# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `yarn start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `yarn test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `yarn build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `yarn eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `yarn build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
