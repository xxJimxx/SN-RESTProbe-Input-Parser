var ApiAwaitUtil = Class.create();
ApiAwaitUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    getMethodsAjax: function() {
        return JSON.stringify(this.getMethods(this.getParameter('sysparm_scriptInclude')));
    },
    getMethods: function(scriptInclude) {
        var result = {
            data: []
        };
        if (!scriptInclude) {
            return result;
        }
        var api = GlideEvaluator.evaluateString('new ' + scriptInclude + '()');
        var proto = Object.getPrototypeOf(api);
        for (key in proto) {
            if (key != 'initialize' && !key.startsWith('_') && typeof api[key] == 'function') {
                if (api[key].toString().substring(1, 12) !== 'function ()') {
                    result.data.push(key);
                }
            }
        }
        result.data.sort();
        return result;
    },
    getRestProbeAjax: function() {
        var result = {};
        var grECC = new GlideRecord('ecc_queue');
        if (grECC.get(this.getParameter('sysparm_id'))) {
            var probe = new WM_ECC_RESTProbe();
            result = probe.toObject(grECC);
        }
        return JSON.stringify(result);
    },

    type: 'ApiAwaitUtil'
});
