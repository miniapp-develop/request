const { RequestError } = require('@mini-dev/request-wx');

// 统一错误格式化：库自身动作抛 RequestError（带 code），原生错误原样透传（无 code）。
// 用 instanceof RequestError 判定，而不是 duck-type e.code（原生错误也可能带 code 字段）。
function formatError(e) {
    if (e instanceof RequestError) {
        return `RequestError(code=${e.code}): ${e.message || ''}  ← 库自身动作`;
    }
    const native = e && (e.errMsg || e.errorMessage || e.error);
    if (native !== undefined && native !== null) {
        return `原生错误原样透传: ${native}  ← 无 code，非 RequestError`;
    }
    return (e && e.message) || String(e);
}

module.exports = formatError;
