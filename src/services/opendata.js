import * as d3 from 'd3'
import yaml from 'js-yaml'
import ccaaPopulationTsv from '../data/poblacio_ccaa-20140101.tsv'
import {t} from 'i18next'

function fetchyaml(uri) {
	const apibase = import.meta.env.VITE_OPENDATA_API_URL
	return d3.text(apibase+uri)
		.then(response => {false && console.debug(response); return response})
		.then(text => {false && console.debug(text); return yaml.load(text)})
}

var geolevel = 'ccaa';

var OpenData = {}

OpenData.metricNames = {}; // Maps metric code -> Metric name
OpenData.population = {}; // Maps geocode -> number
OpenData.metricExtents = {}; // Maps metric code -> [min, max] values of the metric
OpenData.pools = {}; // Maps geolevel -> data pool
OpenData.selectedPool = []; // Current geolevel's pool

// A data pool consists in an array of regions at the given geolevel,
// each region having:
// - parent: parent region codea at the parent geolevel
// - code: own region code
// - name: human name for the region
// - population: relative metric value for the region
// and then an attribute for every metric,
// using the metric code as key and the time series as value.

OpenData.loadRelativeMetrics = function() {
	// TODO: This should be taken from API
	OpenData.population = {}
	OpenData.populationByCCAA = OpenData.population['ccaas'] = {};
	ccaaPopulationTsv.map(function(v) {
		v.population=parseInt(v.population_2014_01);
		OpenData.population['ccaas'][v.code]=v;
	});
}

OpenData.retrieveData = async function() {
	OpenData.loadRelativeMetrics();
	await OpenData.retrieveMetricList()
		.then((result) => Promise.all(result.metrics.map(
			(metric) => OpenData.retrieveMetricData(metric)
		)))
		.then(() => OpenData.selectGeolevel('ccaa'))
	;
};

OpenData.retrieveMetricList = function() {
	OpenData.metricNames = {};  // metric key -> description
	OpenData.metricdata = {}; // metric key -> data
	OpenData.metricExtents = {}; // metric key -> extents 
	return fetchyaml('/discover/metrics')
}

OpenData.retrieveMetricData = function(metric) {
	OpenData.metricNames[metric.id] = metric.text;
	OpenData.metricNames[metric.id + '_change'] = t("INCREASE_OF_METRIC", {metric: metric.text});
	OpenData.metricNames[metric.id + '_per1M'] = t("METRIC_PER_M_INHABITANTS", {metric: metric.text});
	return fetchyaml('/'+ metric.id + '/by/'+geolevel+'/monthly/from/2010-10-10?country=ES')
		.then(metricdata => {
			//console.log("Loaded data for metric ", metric.id)
			processData(metric.id, metricdata);
			return metricdata;
		})
	;
}

OpenData.selectGeolevel = function(geolevel) {
	// Select the data at the desired geolevel (ccaa)
	OpenData.selectedPool = Object.keys(OpenData.pools.ccaas).map(
		function (ccaa) { return OpenData.pools.ccaas[ccaa]; }
	);
}
OpenData.dates = function() {
	if (OpenData.metricdata && OpenData.metricdata.contracts) {
		return OpenData.metricdata.contracts.dates;
	}
	return [
		new Date("2010-01-01"),
		new Date("2010-02-01"),
		new Date("2010-03-01"),
	];
}

function processData(metric, metricdata) {
	// Store the original metric data (unused=)
	OpenData.metricdata[metric] = metricdata;
	// Turn string iso dates into actual dates
	metricdata.dates = metricdata.dates.map(function(d) { return new Date(d);})
	// Fill the metric in the pools recursively starting at country level
	Object.keys(metricdata.countries).map(function(countryCode) {
		appendPool(metric, metricdata.countries, countryCode, 'ccaas');
	});
	// Compute the numeric range (extents) of the metric
	['', '_change', '_per1M'].map((suffix) => {
		var values = Object.keys(OpenData.pools.ccaas).map(function(ccaa) {
			return d3.extent(OpenData.pools.ccaas[ccaa][metric+suffix] || []);
		})
		OpenData.metricExtents[metric+suffix] = d3.extent(d3.merge(values));
	});
}

function appendPool(metric, context, parentCode, level) {

	function diff(array) {
		var previous = 0;
		return array.map(function (v) {
			var result = v - previous;
			previous = v;
			return result;
		});
	}

	if (context===undefined) return;
	var children = context[parentCode][level];
	if (OpenData.pools[level] === undefined) {
		OpenData.pools[level] = {};
	}
	Object.keys(children).map(function(code) {
		var child = children[code];
		var childTarget = OpenData.pools[level][code];
		if (!childTarget) {
			childTarget = OpenData.pools[level][code] = {
				parent: parentCode,
				code: code,
				name: child.name,
			};
			if (OpenData.population[level] !== undefined) {
				childTarget.population = OpenData.population[level][code]!==undefined ?
						OpenData.population[level][code].population:
						OpenData.population[level]['00'].population;
			}
		}
		childTarget[metric] = child.values;
		childTarget[metric+'_change'] = diff(child.values);
		var population = childTarget.population;
		if (population) {
			childTarget[metric+'_per1M'] = child.values.map(function(v) {
				return 1000000*v/population;
			});
		}
		//appendPool(metric, child.states, code, 'states');
	});
}

OpenData.metricText = function(metric) {
	return OpenData.metricNames[metric];
};
OpenData.metricOptions = function(selected) {
	return Object.keys(OpenData.metricNames).map(function(key) {
		return {
			value: key,
			text: OpenData.metricText(key),
			selected: key === selected,
		};
	});
};
OpenData.interpolateDate = function(date) {
	var i = d3.bisectLeft(OpenData.dates(), date, 0, OpenData.dates().length - 1);
	var factor = i>0?
		(date - OpenData.dates()[i]) / (OpenData.dates()[i-1] - OpenData.dates()[i]):
		0;
	return OpenData.selectedPool.map(function(object) {
		function interpolate(source) {
			if (i===0) return source[i];
			return source[i] * (1-factor) + source[i-1] * factor;
		}
		function getValue(source) {
			const minimum = 0; // 1 for log, 0 for linear
			if (!source) return minimum;
			var value = interpolate(source);
			if (!value) return minimum;
			return value;
		}
		var interpolated = {
			date: date,
			code: object.code,
			parent: object.parent,
			name: object.name,
		};
		Object.keys(OpenData.metricNames).map(function(metric) {
			interpolated[metric] = getValue(object[metric]);
		})
		return interpolated;
	});
};


export default OpenData

// vim: noet ts=2 sw=2
