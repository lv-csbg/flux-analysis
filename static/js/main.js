function htmlToElement(html) {
    var template = document.createElement('template');
    html = html.trim(); // Never return a text node of whitespace as the result
    template.innerHTML = html;
    return template.content.firstChild;
}
function addMessage(message) {
    var container = document.getElementById("messages");
    var messageEl = htmlToElement('<div>' + message + '</div>');
    container.appendChild(messageEl);
}

pyodideWorker.onerror = (e) => {
    console.log(`Error in pyodideWorker at ${e.filename}, Line: ${e.lineno}, ${e.message}`)
}

pyodideWorker.onmessage = (e) => {
    console.log(e);
    const { type, results, error } = e.data
    if (type === "status") {
        addMessage(results)
    }
    if (results) {
        console.log('pyodideWorker return results: ', results);
        if (results.result_type === 'fba_fluxes') {
            b.set_reaction_data(JSON.parse(results.result));
            addMessage("Finished FBA");
        }
    } else if (error) {
        console.log('pyodideWorker error: ', error)
    }
}

var program_full = `import sys
print(sys.getrecursionlimit())
sys.setrecursionlimit(1000)
print(sys.getrecursionlimit())
import cobra.io as cio
from cobra.flux_analysis import flux_variability_analysis
from js import model_json_string

model = cio.from_json(model_json_string)
fba_results = model.optimize()

#fva_results = flux_variability_analysis(model, fraction_of_optimum=0.5)
{'result_type':'fba_fluxes', 'result': fba_results.fluxes.to_json()}`;


function init() {
    addMessage("Python initialisation started...");
    escher.libs.d3_json('static/data/maps/e_coli_core.Core-metabolism.json', function (error, data) {
        if (error) console.warn(error);
        var options = { menu: 'all', fill_screen: true };
        var modelDataUrl = 'static/data/models/e_coli_core.json';
        window.b = escher.Builder(data, null, null, escher.libs.d3_select('#map_container'), options);
        fetch(modelDataUrl)
            .then((x) => x.json())
            .then((json) => {
                window.model = json;
                b.load_model(json);
                window.model_json_string = JSON.stringify(json)
                const data_full = {
                    model_json_string: model_json_string,
                    python: program_full
                };
                pyodideWorker.postMessage(data_full);
            });
    });
}