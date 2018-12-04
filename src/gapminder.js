'use strict';

var d3 = require('d3');
var m = require('mithril');
const _ = require('./translate');
require('./gapminder.styl');


function diff(array) {
	var previous = 0;
	return array.map(function (v) {
		var result = v - previous;
		previous = v;
		return result;
	});
}

var contracts = require('./data/contracts_ccaa_monthly.yaml');
var members = require('./data/members_ccaa_monthly.yaml');
contracts.dates=contracts.dates.map(function(d) { return new Date(d);})
members.dates=members.dates.map(function(d) { return new Date(d);})
var dates = contracts.dates;

function appendPool(target, attribute, context, dates, parentCode, level) {
	context = context[parentCode][level];
	Object.keys(context).map(function(code) {
		var object = context[code];
		if (!target[code])
			target[code] = {
				parent: parentCode,
				code: code,
				name: object.name,
			};
		target[code][attribute] = object.values;
		target[code][attribute+'_change'] = diff(object.values);
	});
}
var pool = {};
Object.keys(contracts.countries).map(function(countryCode) {
	appendPool(pool, 'contracts', contracts.countries, contracts.dates, countryCode, 'ccaas');
	appendPool(pool, 'members', members.countries, members.dates, countryCode, 'ccaas');
});
pool = Object.keys(pool).map(function (k) { return pool[k]; });


var metrics = {
	contracts: _('Contratos'),
	contracts_change: _('Nuevos contratos'), 
	members: _('Personas socias'),
	members_change: _('Nuevas personas socias'),
};
var metricOptions = Object.keys(metrics).map(function(key) {
	return {
		value: key,
		text: metrics[key],
	};
});

const GapMinder = {};
GapMinder.oninit = function(vn) {
	var self = this;
	// Exposed api
	self.api = vn.attrs.api || {};
	self.api.play = function() { self.play && self.play(); };
	self.api.stop = function() { self.stop && self.stop(); };
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
		.domain([1,d3.max(contracts.values)])
		.range([10, width])
		.clamp(true)
		;
	var xScaleLinear = d3.scaleLinear()
		.domain(d3.extent(contracts.values))
		.range([10, width])
		.clamp(true)
		;
	self.xScale = xScaleLog;

	var yScaleLog = d3.scaleLog()
		.domain([1,d3.max(members.values)])
		.range([height, 10])
		.clamp(true)
		;
	var yScaleLinear = d3.scaleLinear()
		.domain(d3.extent(members.values))
		.range([height, 10])
		.clamp(true)
		;
	self.yScale = yScaleLog;
	var radiusScale = d3.scaleSqrt()
		.domain(d3.extent(members.values))
		.range([5, 200])
		;
	var colorScale = d3.scaleOrdinal(d3.schemeAccent);

	var timeBounds = d3.extent(dates);

	var timeScale = d3.scaleTime()
		.domain(timeBounds)
		.range([0,width])
		;

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
		.text(metrics[self.parameters.x]);

	// Add a y-axis label.
	self.yLabel = view.append("text")
		.attr("class", "y label")
		.attr("text-anchor", "end")
		.attr("y", axisLabelMargin)
		.attr("x", "-1em")
		.attr("dy", ".75em")
		.attr("transform", "rotate(-90)")
		.text(metrics[self.parameters.y]);

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

	// Add the date label; the value is set on transition.
	var dateLabel = view.append("text")
		.attr("class", "date label")
		.attr("text-anchor", "start")
		.attr("y", 120)
		.attr("x", 24)
		.text('0000-00');

	self.setXMetric = function(metric) {
		self.parameters.x = metric;
		self.xLabel.text(metrics[metric]);
		resetXAxis(self.xScale);
	};
	self.setYMetric = function(metric) {
		self.parameters.y = metric;
		self.yLabel.text(metrics[metric]);
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
			.call(position)
			.sort(order);

	// Updates the display to show the specified date.
	function displayDate(date) {
		self.currentDate=date;
		dot
			.data(interpolateData(date), key)
			.call(position)
			.sort(order)
			;
		dateLabel.text(date.toISOString().slice(0,7));
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
			};
		});
	}
	self.loadData = function() {
		// Add a title.
		dot.append("title")
			.text(function(d) { return d.name; });

		// Add an overlay for the date label.
		var box = dateLabel.node().getBBox();

		var overlay = view.append("rect")
			.attr("class", "overlay")
			.attr("x", box.x)
			.attr("y", box.y)
			.attr("width", box.width)
			.attr("height", box.height)
			.on("mouseover", enableInteraction);

		// Start a transition that interpolates the data based on date.
		self.play = function() {
			self.stop();
			view.transition()
				.duration(60000)
				.ease(d3.easeLinear)
				.tween("dateplay", dateplay)
				.on("end", self.play);
			overlay.on("mouseover", enableInteraction);
		};
		self.stop = function() {
			view.transition().duration(0);
		};

		// After the transition finishes, you can mouseover to change the date.
		function enableInteraction() {
			// Cancel the current transition, if any.
			self.stop();

			var dateScale = d3.scaleTime()
				.domain(timeBounds)
				.range([box.x + 10, box.x + box.width - 10])
				.clamp(true)
				;

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
	self.play();
};

GapMinder.view = function(vn) {
	return m('.gapminder', vn.attrs);
};

const Select = require('./mdc/select');
const Layout = require('./mdc/layout');
const Row = Layout.Row;
const Cell = Layout.Cell;

GapMinder.Example = {};
GapMinder.Example.api = {};
GapMinder.Example.xmetric = 'contracts';
GapMinder.Example.ymetric = 'members';
GapMinder.Example.rmetric = 'members_change';
GapMinder.Example.view = function(vn) {
	return m('', [
		m(GapMinder, {
			api: GapMinder.Example.api,
			xmetric: GapMinder.Example.xmetric,
			ymetric: GapMinder.Example.ymetric,
			rmetric: GapMinder.Example.rmetric,
			style: {
				height: '800px',
			},
		}),
		m('button', {
			onclick: function() { GapMinder.Example.api.play();},
		},_('Replay')),
		m('button', {
			onclick: function() { GapMinder.Example.api.stop();},
		},_('Stop')),
		m(Row, [
			m(Cell, {span: 4}, m(Select, {
				label: _('Eje X'),
				options: metricOptions,
				required: true,
				value: 'contracts',
				value: GapMinder.Example.xmetric,
				onchange: function(ev) {
					var metric = ev.target.value;
					GapMinder.Example.xmetric = metric;
					GapMinder.Example.api.setX(metric);
				},
			})),
			m(Cell, {span: 4}, m(Select, {
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
			m(Cell, {span: 4}, m(Select, {
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
		])
	]);
};


module.exports=GapMinder;

