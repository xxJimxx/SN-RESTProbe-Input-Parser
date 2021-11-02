var jmRESTMessage = Class.create();
jmRESTMessage.prototype = {
    initialize: function() {
        this.restAPI = new sn_ws.jmRESTMessageV2();
        this.restAPI.setRequestHeader('Content-Type', 'application/json');
        this.restAPI.setRequestHeader('Accept', 'application/json');
    },

    getRequestHeaders: function() {
        return this.restAPI.getRequestHeaders();
    },
    setRequestHeaders: function(objHeaders) {
        for (var header in objHeaders) {
            this.restAPI.setRequestHeader(header, objHeaders[header]);
        }
    },
    setRequestQueryParams: function(objParams) {
        for (var p in objParams) {
            this.restAPI.setQueryParameter(p, objParams[p]);
        }
    },

    getAsync: function(url, midServer) {
        return this._executeAsync('get', url, midServer);
    },
    postAsync: function(url, midServer, objPayload) {
        return this._executeAsync('post', url, midServer, objPayload);
    },
    putAsync: function(url, midServer, objPayload) {
        return this._executeAsync('put', url, midServer, objPayload);
    },
    deleteAsync: function(url, midServer, objPayload) {
        return this._executeAsync('delete', url, midServer, objPayload);
    },
    _executeAsync: function(method, url, midServer, objPayload) {
        if (!url) {
            throw new Error('Missing URL');
        }
        if (objPayload && typeof objPayload != 'object') {
            throw new Error('objPayload must be an object; not a ' + typeof objPayload + '.');
        }

        this.restAPI.setHttpMethod(method);
        this.restAPI.setEndpoint(url);
        this.restAPI.setMIDServer(midServer);
        if (objPayload) {
            this.restAPI.setRequestBody(JSON.stringify(objPayload));
        }

        var response = this.restAPI.executeAsync();
        return true;
    },

    get: function(url, midServer) {
        return this._execute('get', url, midServer, null);
    },
    post: function(url, midServer, objPayload) {
        return this._execute('post', url, midServer, objPayload);
    },
    put: function(url, midServer, objPayload) {
        return this._execute('put', url, midServer, objPayload);
    },
    'delete': function(url, midServer, objPayload) {
        return this._execute('delete', url, midServer, objPayload);
    },
    _execute: function(method, url, midServer, objPayload) {
        var result = {
            "request": {
                "method": method,
                "url": url,
                "headers": this.restAPI.getRequestHeaders() || {},
                "parameters": {},
                "data": objPayload
            },
            "response": {
                "statusCode": 0,
                "headers": {},
                "data": {},
                "hasError": false,
                "error": '',
                "ecc": 'RESTClient'
            }
        };

        if (!url) {
            throw new Error('Missing URL');
        }

        if (objPayload && typeof objPayload != 'object') {
            throw new Error('objPayload must be an object; not a ' + typeof objPayload + '.');
        }

        this.restAPI.setHttpMethod(method);
        this.restAPI.setEndpoint(url);
        this.restAPI.setMIDServer(midServer);
        if (objPayload) {
            this.restAPI.setRequestBody(JSON.stringify(objPayload));
        }

        try {
            var response = this.restAPI.execute();
            result.response.statusCode = response.getStatusCode();
            result.response.data = this._jsonParse(response.getBody());
            result.response.headers = {};
            var headers = response.getAllHeaders();
            for (var h in headers) {
                result.response.headers[headers[h].name] = headers[h].value;
            }
            result.response.error = response.getErrorMessage();
            result.response.hasError = (result.response.error) ? true : false;

            if (result.response.statusCode < 200 || result.response.statusCode >= 300) {
                result.response.hasError = true;
            }
        } catch (ex) {
            result.response.statusCode = 400;
            result.response.error = ex.message;
            result.response.hasError = true;
            if (ex.message.startsWith('No response for ECC message')) {
                result.response.statusCode = 408;
            }
        }

        //finally
        if (!midServer) {
            var probe = new ECC_RESTProbe();
            var grECC = probe.toECC(result);
            result.response.ecc = grECC.getValue('sys_id');
        }
        return result;
    },

    getjmRESTMessage: function() {
        return this.restAPI;
    },
    setjmRESTMessage: function(api) {
        this.restAPI = api;
    },

    _jsonParse: function(json) {
        var out = json;
        try {
            out = JSON.parse(json);
        } catch (ex) {
            return out;
        }
        return out;
    },

    type: 'jmRESTMessage'
};
