# 部署规则

## Netlify 生产站点

每次发布 `codex/netlify-deploy` 分支时，必须将同一个 Git 提交同步部署到以下两个 Netlify 生产站点：

- https://atube-lab.netlify.app/
- https://atube-inspiration-lab.netlify.app/

不得只更新其中一个站点。部署完成后，必须分别确认两个站点的生产部署状态为 `ready`，并验证首页和本次涉及的 Netlify Functions 接口可以正常访问。

部署记录应注明 Git 提交号以及两个站点各自的 Netlify Deploy ID，便于核对它们是否来自同一版本。
