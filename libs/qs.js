function queryStringify(data) {
    if (!data) {
        return '';
    }
    return Object.entries(data)
        .map(([key, value]) => {
            return encodeURIComponent(key) + '=' + encodeURIComponent(value);
        })
        .join('&');
}

exports.urlStringify = function (originUrl, data) {
    const queryString = queryStringify(data);
    if (queryString.length > 0) {
        if (originUrl.indexOf('?') === -1) {
            return originUrl + '?' + queryString;
        } else if (originUrl.endsWith('?')) {
            return originUrl + queryString;
        } else {
            return originUrl + '&' + queryString;
        }
    }
    return originUrl;
};
