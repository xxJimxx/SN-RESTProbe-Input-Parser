(function executeRule(current, previous /*null when async*/ ) {
//Async Business Rule on ecc_queue insert 
//current.topic == "RESTProbe" && current.queue == "input" && current.state == "ready" 
	
    var probe = new ECC_RESTProbe();
    var result = probe.toObject(current);
    if (!result || !result.request || !result.request.headers || !result.request.headers["SN.PROCESS_ID"]) {
        return;
    }

    var api = null;
    try {
        var grAwait = new GlideRecord('u_api_await');
        grAwait.addQuery('u_active', true);
        grAwait.addQuery('u_process_id', result.request.headers["SN.PROCESS_ID"]);
        grAwait.query();
        if (grAwait.next()) {
            var prop = {
                scriptInclude: grAwait.u_script_include.name.toString(),
                method: grAwait.getValue('u_method_name')
            };
            api = GlideEvaluator.evaluateString('new ' + prop.scriptInclude + '()');
            api[prop.method](result);
        } 
    } 
	catch (ex) {
        if (api) {
            gs.log(ex.message, api.type);
        } else {
            gs.log(ex.message, 'WMT ECC RESTProbe Await');
        }
    }
})(current, previous);
