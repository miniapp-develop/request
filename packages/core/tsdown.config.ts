import { defineConfig } from 'tsdown';
import { writeFileSync, readFileSync } from 'node:fs';
import { resolveDeps } from '../../scripts/build-deps.cjs';

// 双格式发布产物：dist/cjs（CommonJS，也是微信小程序「构建 npm」的落点，
// 对应 package.json 的 miniprogram 字段）与 dist/esm（ES Module）。
// 每个 pass 显式 target: 'es2015'——tsdown 不读 tsconfig.target 做降级兜底，
// 不显式设置时会拿 package.json 的 engines.node 反推，产生无报错的降级失效。
// dts 各自跟随所在 pass 生成（per-format），不拆第三个 dts-only pass。
// dts.sourcemap 与顶层 sourcemap 保持一致，避免 .d.ts 尾部悬空 sourceMappingURL。
// 单入口 index，无共享 chunk；koa-compose 为普通依赖（不内联打包），构建时外置 require。
export default defineConfig([
    {
        entry: { index: 'src/index.ts' },
        format: ['cjs'],
        target: 'es2015',
        outDir: 'dist/cjs',
        outExtensions: () => ({ js: '.js' }),
        hash: false,
        dts: { sourcemap: true },
        sourcemap: true,
        clean: false,
        onSuccess: async () => {
            // dist/cjs 会被微信「构建 npm」整体复制为 miniprogram_npm/@mini-dev/request/，
            // 这里的 package.json 即成为该包在小程序运行时的 package.json。
            // 若只有 {type:commonjs}，微信运行时会因找不到 dependencies 而拒绝跨包
            // require('koa-compose')（即便 koa-compose 已构建进 miniprogram_npm）。
            // 因此把 main 与 dependencies 透传进来（协议解析为实版本），让运行时放行跨包 require。
            const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
            writeFileSync(
                'dist/cjs/package.json',
                JSON.stringify(
                    {
                        type: 'commonjs',
                        main: 'index.js',
                        dependencies: resolveDeps(pkg.dependencies, import.meta.url)
                    },
                    null,
                    2
                ) + '\n'
            );
        }
    },
    {
        entry: { index: 'src/index.ts' },
        format: ['esm'],
        target: 'es2015',
        outDir: 'dist/esm',
        outExtensions: () => ({ js: '.js' }),
        hash: false,
        dts: { sourcemap: true },
        sourcemap: true,
        clean: false,
        onSuccess: async () => {
            writeFileSync('dist/esm/package.json', JSON.stringify({ type: 'module' }, null, 2) + '\n');
        }
    }
]);
