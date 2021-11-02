var ECC_RESTProbe = Class.create();
ECC_RESTProbe.prototype = {
    initialize: function() {},

    toObject: function(grECC) {
        var payloadXML = grECC.getValue('payload');
        if (payloadXML == '<see_attachment/>') {
            var sa = new GlideSysAttachment();
            payloadXML = sa.get(grECC, 'payload');
        }
        if (!payloadXML) {
            return null;
        }

        var payloadJSON = this._xmlToNormalizedJSON(payloadXML, null);
        if (!payloadJSON) {
            return null;
        }
        payloadXML = null;
        if (payloadJSON.results['error']) {
            payloadJSON.results.parameters.error_string += payloadJSON.results['error'];
        }
        payloadJSON.results.parameters.responseTime = 0;
        if (payloadJSON.results['probe_time'] && !isNaN(payloadJSON.results['probe_time'])) {
            payloadJSON.results.parameters.responseTime = parseInt(payloadJSON.results['probe_time']);
        }

        if (payloadJSON.results.result.output) {
            payloadJSON.results.result.output = this._jsonParse(payloadJSON.results.result.output);
        }
        if (payloadJSON.results.parameters.content) {
            payloadJSON.results.parameters.content = this._jsonParse(payloadJSON.results.parameters.content);
        }
        if (payloadJSON.results.parameters.message_headers) {
            var headers = this._xmlToNormalizedJSON(payloadJSON.results.parameters.message_headers, 'fields');
            if (headers) {
                payloadJSON.results.parameters.message_headers = headers;
            }
        }
        if (payloadJSON.results.parameters.message_parameters) {
            var params = this._xmlToNormalizedJSON(payloadJSON.results.parameters.message_parameters, 'fields');
            if (params) {
                payloadJSON.results.parameters.message_parameters = params;
            }
        }

        return this._dataMap_ECCtoJSON(payloadJSON.results, grECC.getValue('sys_id'));
    },
    toXML: function(json) {
        var XML = new XMLHelper();
        return XML.toXMLStr(json);
    },
    toECC: function(objResult) {
        var grECC = new GlideRecord('ecc_queue');
        grECC.initialize();
        grECC.setValue('agent', 'RESTClient');
        grECC.setValue('topic', 'RESTProbe');
        grECC.setValue('queue', 'input');
        grECC.setValue('state', 'processed');
        grECC.setValue('name', objResult.request.method);
        grECC.setValue('source', objResult.request.url);
        grECC.setValue('processed', new GlideDateTime());
        var payload = this._dataMap_JSONtoECCPayload(objResult);
        payload.result.output = JSON.stringify(payload.result.output);
        payload.parameters.content = JSON.stringify(payload.parameters.content);
        payload.parameters.message_headers = this._jsonToNormalizedXML(payload.parameters.message_headers, 'fields', 'field');
        payload.parameters.message_parameters = this._jsonToNormalizedXML(payload.parameters.message_parameters, 'fields', 'field');

        grECC.setValue('payload', '<?xml version="1.0" encoding="UTF-8"?>' + this.toXML({
            results: payload
        }));
        grECC.setWorkflow(false);
        grECC.insert();
        return grECC;
    },
    normalizeJSON: function(json) {
        /* recursive method to iterate through complex JSON that has been converted from XML intending to flatten name/value pairs. */
        try {
            var out = {};
            for (var key in json) {
                if (Array.isArray(json[key])) {
                    var n = this._xmlFormatCorrection(json[key]);

                    if (n) {
                        out = n;
                    } else {
                        out[key] = json[key];
                    }

                } else if (typeof json[key] == 'object') {
                    out[key] = this.normalizeJSON(json[key]);
                } else {
                    out[key] = json[key];
                }
            }
            return out;
        } catch (ex) {
            gs.error(this.type + ' [normalizeJSON] Error: ' + ex.message);
        }
    },

    _xmlToNormalizedJSON: function(xml, p) {
        //p is root property from JSON to return, 
        try {
            xml = this._fixXmlWhiteSpace(xml);
            var json = gs.xmlToJSON(xml);
            if (!json) {
                return null;
            }
            var n = this.normalizeJSON(json);

            if (p && n[p]) {
                return n[p];
            }
            return n;

        } catch (ex) {
            return null;
        }
    },
    _jsonToNormalizedXML: function(json, p1, p2) {
        var output = {};
        output[p1] = {};
        output[p1][p2] = [];
        for (key in json) {
            output[p1][p2].push({
                '@name': key,
                '@value': json[key]
            });
        }
        return this.toXML(output);
    },
    _fixXmlWhiteSpace: function(s) {
        //The gs.xmlToJSON() method doesn't handle character entities.
        //So I'm replacing the common ones for whitespace characters that appear
        //in the ecc_queue payload strings that I'm primarily working with.
        if (s.match(/&#/ig) != null) {
            s = s.replace(/&#13;/ig, "\r");
            s = s.replace(/&#10;/ig, "\n");
            if (s.match(/&#/ig) == null) {
                return s;
            }
            s = s.replace(/&#9;/ig, "\t");
            s = s.replace(/&#09;/ig, "\t");
        }

        return s;
    },
    _xmlFormatCorrection: function(arrInput) {
        /*
		gs.xmlToJSON leaves some properties in an array of name/value objects.  
		This method is intended to flatten to a standard JSON format.
		*/
        var out = {};
        if (arrInput.length > 0 && typeof arrInput[0] == 'object') {
            var cnt = 0;
            for (var k in arrInput[0]) {
                if (k != 'name' && k != 'value') {
                    return null;
                }
                cnt++;
            }

            if (cnt != 2) {
                return null;
            }
            arrInput.forEach(function(item, index) {
                out[item.name] = item.value;
            });
            return out;
        }

        return null;

    },
    _jsonParse: function(json) {
        try {
            if (!(typeof json == 'string')) {
                return json;
            }
            if (json.startsWith('[')) {
                json = '{"arrTemp":' + json + '}';
            }
            json = JSON.parse(json);
            json = this.normalizeJSON(json);
            if (json.arrTemp) {
                json = json.arrTemp;
            }
        } catch (ex) {
            return json;
        }
        return json;
    },
    _dataMap_ECCtoJSON: function(restECCResponse, ecc) {
        var result = {
            "request": {
                "method": restECCResponse.parameters.http_method || '',
                "url": restECCResponse.parameters.source || '',
                "headers": restECCResponse.parameters.message_headers || {},
                "parameters": restECCResponse.parameters.message_parameters || {},
                "data": restECCResponse.parameters.content || {}
            },
            "response": {
                "statusCode": 0,
                "headers": restECCResponse.httpHeaders || {},
                "data": restECCResponse.result.output || {},
                "hasError": (restECCResponse.parameters.error_string) ? true : false,
                "error": restECCResponse.parameters.error_string || '',
                "responseTime": restECCResponse.parameters.responseTime,
                "ecc": ecc
            }
        };
        if (restECCResponse.parameters.http_status_code && !isNaN(restECCResponse.parameters.http_status_code)) {
            result.response.statusCode = parseInt(restECCResponse.parameters.http_status_code);
        }

        if (result.response.statusCode < 200 || result.response.statusCode >= 300) {
            result.response.hasError = true;
        }

        return result;
    },
    _dataMap_JSONtoECCPayload: function(json) {
        var payload = {
            result: {
                output: json.response.data
            },
            httpHeaders: json.response.headers || {},
            parameters: {
                source: json.request.url || '',
                content: json.request.data || {},
                message_headers: json.request.headers || {},
                http_method: json.request.method || '',
                message_parameters: json.request.parameters || {},
                http_status_code: json.response.statusCode || 0,
                error_string: json.response.error
            }
        };
        return payload;
    },

    type: 'ECC_RESTProbe'
};
