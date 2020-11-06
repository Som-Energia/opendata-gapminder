'use strict';

var d3 = require('d3');
var m = require('mithril');
const _ = require('./translate');
var css = require('./style.styl');
require('./gapminder.styl');
require('font-awesome/css/font-awesome.css');
require('@material/typography/dist/mdc.typography.css').default;
var yaml = require('js-yaml');

var apibase = 'https://opendata.somenergia.coop/v0.2';
var apibase = 'http://localhost:5001/v0.2';

function fetchyaml(uri) {
	return d3.text(uri)
		.then(response => {console.debug(response); return response})
		.then(text =>  {console.debug(text); return yaml.safeLoad(text)})
}


var OpenData = {}
OpenData.metrics = {
	contracts: _('Contratos'),
	contracts_change: _('Nuevos contratos'), 
	contracts_per1M: _('Contratos por millón de habitantes'),
	members: _('Personas socias'),
	members_change: _('Nuevas personas socias'),
	members_per1M: _('Personas socias por millón de habitantes'),
};
OpenData.basicMetrics = {};
OpenData.loadAvailableMetrics = function() {
	return fetchyaml(apibase + '/introspection/metrics')
		.then(result => {
			OpenData.basicMetrics = result;
			console.debug(result);
			OpenData.metrics = {};
			result.metrics.map(o => {
				OpenData.metrics[o.id] = o.text;
				OpenData.metrics[o.id + '_change'] = _('Incremento de ') + o.text;
				OpenData.metrics[o.id + '_per1M'] = o.text + _(' por millón de habitantes');
			})
			m.redraw();
		})
}

OpenData.loadAvailableMetrics()



function diff(array) {
	var previous = 0;
	return array.map(function (v) {
		var result = v - previous;
		previous = v;
		return result;
	});
}

var populationTsv = require('dsv-loader?delimiter=\t!./data/poblacio_ccaa-20140101.csv');
var populationCCAA = {};
populationTsv.map(function(v) {
	v.population=parseInt(v.population_2014_01);
	populationCCAA[v.code]=v;
});


// https://opendata.somenergia.coop/v0.2/contracts/by/ccaa/monthly
OpenData.contracts = require('./data/contracts_ccaa_monthly.yaml');
OpenData.contracts.dates=OpenData.contracts.dates.map(function(d) { return new Date(d);})
// https://opendata.somenergia.coop/v0.2/members/by/ccaa/monthly
OpenData.members = require('./data/members_ccaa_monthly.yaml');
OpenData.members.dates=OpenData.members.dates.map(function(d) { return new Date(d);})

var dates = OpenData.contracts.dates;

function appendPool(target, metric, context, dates, parentCode, level) {
	if (context===undefined) return;
	var children = context[parentCode][level];
	if (target[level] === undefined) {
		target[level] = {};
	}
	Object.keys(children).map(function(code) {
		var child = children[code];
		var childTarget = target[level][code];
		if (!childTarget) {
			childTarget = target[level][code] = {
				parent: parentCode,
				code: code,
				name: child.name,
			};
			childTarget.population=
				level==='ccaas' && populationCCAA[code]!==undefined ?
					populationCCAA[code].population:
					populationCCAA['00'].population;
		}
		var population = childTarget.population;
		childTarget[metric] = child.values;
		childTarget[metric+'_change'] = diff(child.values);
		childTarget[metric+'_per1M'] = child.values.map(function(v) {
			return 1000000*v/population;
			});
		appendPool(target, metric, child.states, dates, code, 'states');
	});
}

var pools = {};
Object.keys(OpenData.contracts.countries).map(function(countryCode) {
	appendPool(pools, 'contracts', OpenData.contracts.countries, OpenData.contracts.dates, countryCode, 'ccaas');
	appendPool(pools, 'members', OpenData.members.countries, OpenData.members.dates, countryCode, 'ccaas');
});
var pool = Object.keys(pools.ccaas).map(function (k) { return pools.ccaas[k]; });

var metricExtents = {};
Object.keys(OpenData.metrics).map(function(metric) {
	var values = Object.keys(pools.ccaas).map(function(key) {
		return d3.extent(pools.ccaas[key][metric] || []);
	})
	metricExtents[metric] = d3.extent(d3.merge(values));
});
console.log(metricExtents);

const GapMinder = {};
GapMinder.oninit = function(vn) {
	var self = this;
	// Exposed api
	self.api = vn.attrs.api || {};
	self.api.play = function() { self.play && self.play(); };
	self.api.pause = function() { self.pause && self.pause(); };
	self.api.setXLinear = function() { self.setXLinear && self.setXLinear(); };
	self.api.setXLog = function() { self.setXLog && self.setXLog(); };
	self.api.setYLinear = function() { self.setYLinear && self.setYLinear(); };
	self.api.setYLog = function() { self.setYLog && self.setYLog(); };
	self.api.setX = function(metric) { self.setXMetric(metric); };
	self.api.setY = function(metric) { self.setYMetric(metric); };
	self.api.setR = function(metric) { self.parameters.r = metric; };
	self.parameters = {
		x: 'contracts',
		y: 'members',
		r: 'members_change',
		color: 'code',
//		key: 'parent',
		key: 'code',
		name: 'name',
	};
};

GapMinder.oncreate = function(vn) {
	var self = this;
	// Various accessors that specify the four dimensions of data to visualize.
	function pick(param) {
		return function(d) {
			return d[self.parameters[param]];
		};
	}
	var x = pick('x');
	var y = pick('y');
	var radius = pick('r');
	var color = pick('color');
	var key = pick('key');
	var name = pick('name');

	self.width = vn.dom.offsetWidth;
	self.height = vn.dom.offsetHeight;

	// Chart dimensions.
	var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 39.5};
	var width = self.width - margin.right - margin.left;
	var height = self.height - margin.top - margin.bottom;

	// Various scales. These domains make assumptions of data, naturally.
	var xScaleLog = d3.scaleLog()
		.domain([1,d3.max(OpenData.contracts.values)])
		.range([10, width])
		.clamp(true)
		;
	var xScaleLinear = d3.scaleLinear()
		.domain(d3.extent(OpenData.contracts.values))
		.range([10, width])
		.clamp(true)
		;
	self.xScale = xScaleLog;

	var yScaleLog = d3.scaleLog()
		.domain([1,d3.max(OpenData.members.values)])
		.range([height, 10])
		.clamp(true)
		;
	var yScaleLinear = d3.scaleLinear()
		.domain(d3.extent(OpenData.members.values))
		.range([height, 10])
		.clamp(true)
		;
	self.yScale = yScaleLog;
	var radiusScale = d3.scaleSqrt()
		.domain(d3.extent(OpenData.members.values))
		.range([5, 200])
		;
	var colorScale = d3.scaleOrdinal(d3.schemeAccent);


	// The x & y axes.
	var xAxis = d3.axisBottom()
		.scale(self.xScale)
		.ticks(22, d3.format(".0s"))
		;
	var yAxis = d3.axisLeft()
		.scale(self.yScale)
		.ticks(22, d3.format('.0s'))
		;

	var axisLabelMargin = 6;

	// Create the SVG container and set the origin.
	var svg = d3.select(vn.dom).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
		.attr("preserveAspectRatio", 'xMidYMin meet')
		;
	var view = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Add the x-axis.
	view.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + height + ")")
		.call(xAxis);

	// Add the y-axis.
	view.append("g")
		.attr("class", "y axis")
		.call(yAxis);

	// Add an x-axis label.
	self.xLabel = view.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", width)
		.attr("y", height - axisLabelMargin)
		.text(OpenData.metrics[self.parameters.x]);

	// Add a y-axis label.
	self.yLabel = view.append("text")
		.attr("class", "y label")
		.attr("text-anchor", "end")
		.attr("y", axisLabelMargin)
		.attr("x", "-1em")
		.attr("dy", ".75em")
		.attr("transform", "rotate(-90)")
		.text(OpenData.metrics[self.parameters.y]);

	// Add grids
	var xGridAxis = d3.axisBottom()
		.scale(xScaleLog)
		.ticks(22, d3.format(".0s"))
		.tickSize(-height, 0, 0)
		.tickFormat("")
		;
	var xGridAxisLinear = d3.axisBottom()
		.scale(xScaleLinear)
		.ticks(22, d3.format(".0s"))
		.tickSize(-height, 0, 0)
		.tickFormat("")
		;
	var yGridAxis = d3.axisLeft()
		.scale(self.yScale)
		.ticks(22, d3.format('.0s'))
		.tickSize(-width, 0, 0)
		.tickFormat("")
		;
	view.append("g")
		.attr("class", "grid x")
		.attr("transform", "translate(0," + height + ")")
		.call(xGridAxis)
		;
	view.append("g")         
		.attr("class", "grid y")
		.call(yGridAxis)
		;

	view.selectAll('.axis.y').on('click', function() {
		if (self.yScale === yScaleLog)
			self.setYLinear();
		else
			self.setYLog();
	});
	view.selectAll('.axis.x').on('click', function() {
		if (self.xScale === xScaleLog)
			self.setXLinear();
		else
			self.setXLog();
	});

	view.append('line')
		.attr('y2',0)
		.attr('x2',0)
		.attr('y1',10)
		.attr('x1',10)
		.style('stroke', 'red')
		;
	var timePoint = view.append('line');

	// Add the date label; the value is set on transition.
	var dateLabel = view.append("text")
		.attr("class", "date label")
		.attr("text-anchor", "start")
		.attr("y", 0)
		.attr("x", 24)
		.text('0000-00')
		;

	var dateBox = dateLabel.node().getBBox();
	dateLabel.attr("y", dateBox.height-32);
	dateBox = dateLabel.node().getBBox();

	var timeBounds = d3.extent(dates);
	var dateScale = d3.scaleTime()
		.domain(timeBounds)
		.range([dateBox.x + 10, dateBox.x + dateBox.width - 10])
		.clamp(true)
		;

	var dateAxis = d3.axisBottom()
		.scale(dateScale)
		;
	// Add the date-axis.
	view.append("g")
		.attr("class", "time axis")
		.attr("transform", "translate(0," + 10 + ")")
		.call(dateAxis);

	timePoint
		.attr('class', 'timepointer')
		.attr('x1', dateScale(self.currentDate))
		.attr('x2', dateScale(self.currentDate))
		.attr('y1', dateBox.y)
		.attr('y2', dateBox.y+dateBox.height)
		.style('stroke', 'red')
		;

	var currentInfo = view.append('foreignObject')
		.attr('class', 'currentInfo')
		.attr('x', width-200)
		.attr('y', height-56)
		.attr('width', '20em')
		.attr('height', height/3)
		;
	currentInfo.append('xhtml:div')
		.attr('class', 'currentInfoContent')
		;

	self.setXMetric = function(metric) {
		self.parameters.x = metric;
		self.xLabel.text(OpenData.metrics[metric]);
		resetXAxis(self.xScale);
	};
	self.setYMetric = function(metric) {
		self.parameters.y = metric;
		self.yLabel.text(OpenData.metrics[metric]);
		resetYAxis(self.yScale);
	};
	self.setYLinear = function() {
		resetYAxis(yScaleLinear);
	};
	self.setYLog = function() {
		resetYAxis(yScaleLog);
	};
	self.setXLinear = function() {
		resetXAxis(xScaleLinear);
	};
	self.setXLog = function() {
		resetXAxis(xScaleLog);
	};
	function resetXAxis(scale) {
		self.xScale = scale;
		xGridAxis.scale(self.xScale);
		xAxis.scale(self.xScale);
		d3.select(".axis.x")
			.transition()
			.call(xAxis)
			;
		d3.select(".grid.x")
			.transition()
			.call(xGridAxis)
			;
		displayDate(self.currentDate);
	}
	function resetYAxis(scale) {
		self.yScale = scale;
		yGridAxis.scale(self.yScale);
		yAxis.scale(self.yScale);
		d3.select(".axis.y")
			.transition()
			.call(yAxis)
			;
		d3.select(".grid.y")
			.transition()
			.call(yGridAxis)
			;
		displayDate(self.currentDate);
	}
	// Positions the dots based on data.
	function position(dot) {
		dot .attr("cx", function(d) { return self.xScale(x(d)); })
			.attr("cy", function(d) { return self.yScale(y(d)); })
			.attr("r", function(d) { return radiusScale(radius(d)); })
			;
	}

	// Defines a sort order so that the smallest dots are drawn on top.
	function order(a, b) {
		return radius(b) - radius(a);
	}
	// Add a dot per nation. Initialize the data at 1800, and set the colors.
	var dot = view.append("g")
		.attr("class", "dots")
		.selectAll(".dot")
		.data(interpolateData(self.currentDate))
		.enter().append("circle")
			.attr("class", "dot")
			.style("fill", function(d) { return colorScale(color(d)); })
			.on('mouseover', showCurrentDot)
			.on('mousemove', showCurrentDot)
			.on('mouseout', hideCurrentDot)
			.call(position)
			.sort(order);

	function hideCurrentDot(data) {
		currentInfo.style('display', 'none');
	}
	function showCurrentDot(data) {
		const cursorSize = 20;
		const infoWidth = 300; // TODO: Should be 20em as the css .currentInfo width
		const infoHeight = 120; // TODO: Should be ...whatever it is
		currentInfo.style('display', 'block');
		var coordinates = d3.mouse(this);
		var x = coordinates[0]+20;
		if (x+infoWidth>width) {
			x = width - infoWidth;
		}
		var y = coordinates[1]+20;
		if (y+infoHeight>height)
			y = height - infoHeight;
		currentInfo
			.attr('x', x)
			.attr('y', y)
			;
		// TODO: Bisect instead of interpolate
		currentInfo.select('.currentInfoContent').html(
			"<div>"+
			"<span class='colorbox' style='background: "+
			colorScale(data.code)+";'></span>"+
			data.name+
			"</div>"+
			"<div><b>"+_("Mes:")+"</b> "+
			self.currentDate.toISOString().slice(0,7)+
			"</div>"+
			"<div><b>"+OpenData.metrics[self.parameters.x]+":</b> "+
			Math.round(data[self.parameters.x])+
			"</div>"+
			"<div><b>"+OpenData.metrics[self.parameters.y]+":</b> "+
			Math.round(data[self.parameters.y])+
			"</div>"+
			"<div><b>"+OpenData.metrics[self.parameters.r]+":</b> "+
			Math.round(data[self.parameters.r])+
			"</div>"+
			""
		);
	}

	// Updates the display to show the specified date.
	function displayDate(date) {
		self.currentDate=date;
		dot
			.data(interpolateData(date), key)
			.call(position)
			.sort(order)
			;
		dateLabel.text(date.toISOString().slice(0,7));
		timePoint
			.attr('x1', dateScale(self.currentDate))
			.attr('x2', dateScale(self.currentDate))
			;
	}

	// Interpolates the dataset for the given date.
	function interpolateData(date) {
		var i = d3.bisectLeft(dates, date, 0, dates.length - 1);
		var factor = i>0?
			(date - dates[i]) / (dates[i-1] - dates[i]):
			0;
		return pool.map(function(object) {
			function interpolate(source) {
				if (i===0) return source[i];
				return source[i] * (1-factor) + source[i-1] * factor;
			}
			function getValue(source) {
				const minimum = 1; // 1 for log, 0 for linear
				if (!source) return minimum;
				var value = interpolate(source);
				if (!value) return minimum;
				return value;
			}
			return {
				date: date,
				code: object.code,
				parent: object.parent,
				name: object.name,
				members: getValue(object.members),
				contracts: getValue(object.contracts),
				members_change: getValue(object.members_change),
				contracts_change: getValue(object.contracts_change),
				members_per1M: getValue(object.members_per1M),
				contracts_per1M: getValue(object.contracts_per1M),
			};
		});
	}
	self.loadData = function() {

		// Add an overlay for the date label.
		var dateBox = dateLabel.node().getBBox();

		var overlay = view.append("rect")
			.attr("class", "overlay")
			.attr("x", dateBox.x)
			.attr("y", dateBox.y)
			.attr("width", dateBox.width)
			.attr("height", dateBox.height)
			.on("mouseover", enableInteraction);

		// Start a transition that interpolates the data based on date.
		self.replay = function() {
			self.currentDate = timeBounds[0];
			self.play();
		};
		self.play = function() {
			self.pause();
			var remainingFactor = (timeBounds[1]-self.currentDate)/(
				timeBounds[1]-timeBounds[0]);
			view.transition()
				.duration(60000*remainingFactor)
				.ease(d3.easeLinear)
				.tween("dateplay", function() {
					var date = d3.interpolateDate(self.currentDate, timeBounds[1]);
					return function(t) { displayDate(date(t)); };
				})
				.on("end", self.replay);
			overlay.on("mouseover", enableInteraction);
		};
		self.pause = function() {
			view.transition().duration(0);
		};

		// After the transition finishes, you can mouseover to change the date.
		function enableInteraction() {
			// Cancel the current transition, if any.
			self.pause();

			overlay
				.on("mouseover", mouseover)
				.on("mouseout", mouseout)
				.on("mousemove", mousemove)
				.on("touchmove", mousemove);

			function mouseover() {
				dateLabel.classed("active", true);
			}

			function mouseout() {
				dateLabel.classed("active", false);
			}

			function mousemove() {
				displayDate(dateScale.invert(d3.mouse(this)[0]));
			}
		}

		// Tweens the entire chart by first tweening the date, and then the data.
		// For the interpolated data, the dots and label are redrawn.
		function dateplay() {
			var date = d3.interpolateDate(timeBounds[0], timeBounds[1]);
			return function(t) { displayDate(date(t)); };
		}

	};
	self.loadData();
	self.replay();
};

GapMinder.view = function(vn) {
	return m('.gapminder', vn.attrs);
};

const Select = require('./mdc/select');
const Button = require('./mdc/button');
const Layout = require('./mdc/layout');
const Row = Layout.Row;
const Cell = Layout.Cell;

GapMinder.Example = {};
GapMinder.Example.api = {};
GapMinder.Example.xmetric = 'contracts';
GapMinder.Example.ymetric = 'members';
GapMinder.Example.rmetric = 'members_change';
GapMinder.Example.view = function(vn) {
	var metricOptions = Object.keys(OpenData.metrics).map(function(key) {
		return {
			value: key,
			text: OpenData.metrics[key],
		};
	});

	return m(Layout, [
		m(Row, [
			m(Cell, {span: 3},
				m(Button, {
					faicon: 'play',
					outlined: true,
					style: {width: '50%'},
					onclick: function() { GapMinder.Example.api.play();},
				},_('Play')),
				m(Button, {
					faicon: 'pause',
					outlined: true,
					style: {width: '50%'},
					onclick: function() { GapMinder.Example.api.pause();},
				},_('Pause')),
			),
			m(Cell, {span: 3}, m(Select, {
				label: _('Eje X'),
				options: metricOptions,
				required: true,
				value: GapMinder.Example.xmetric,
				onchange: function(ev) {
					var metric = ev.target.value;
					GapMinder.Example.xmetric = metric;
					GapMinder.Example.api.setX(metric);
				},
			})),
			m(Cell, {span: 3}, m(Select, {
				label: _('Eje Y'),
				options: metricOptions,
				required: true,
				value: GapMinder.Example.ymetric,
				onchange: function(ev) {
					var metric = ev.target.value;
					GapMinder.Example.ymetric = metric;
					GapMinder.Example.api.setY(metric);
				},
			})),
			m(Cell, {span: 3}, m(Select, {
				label: _('Radio'),
				options: metricOptions,
				required: true,
				value: GapMinder.Example.rmetric,
				onchange: function(ev) {
					var metric = ev.target.value;
					GapMinder.Example.rmetric = metric;
					GapMinder.Example.api.setR(metric);
				},
			})),
		]),
		m(Row, m(Cell, {span: 12}, m(GapMinder, {
			api: GapMinder.Example.api,
			xmetric: GapMinder.Example.xmetric,
			ymetric: GapMinder.Example.ymetric,
			rmetric: GapMinder.Example.rmetric,
			style: {
				height: '750px',
			},
		}))),
	]);
};

var Main = {
    view: function(vn) {
		return m('.form.mdc-typography', [
            m(GapMinder.Example)
        ]);
    },
};

window.onload = function() {
	var element = document.getElementById("mithril-target");
	m.mount(element, Main);
};


// vim: noet ts=4 sw=4
