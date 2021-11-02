//UI Action: Display RESTProbe record as JSON. (Async/Await model)
function showJSON() {
    window.open("ECC_RESTProbe_JSON.do?sysparm_eccID=" + g_form.getUniqueValue(), 'ECC RESTprobe JSON', 'height=800,width=1000,top=100,left=300,modal=yes');
}
