import request from './app.request';

App({
    onLaunch(options) {
        request.mount(this);
    }
});