function queryStringify(data: unknown): string {
    if (!data) {
        return '';
    }
    return Object.entries(data as Record<string, unknown>)
        .filter(([, value]) => value !== null && value !== undefined)
        .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
        .join('&');
}

export function urlStringify(originUrl: string, data: unknown): string {
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
}
