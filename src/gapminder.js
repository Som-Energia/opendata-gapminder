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

const GapMinder = {};
GapMinder.oninit = function(vn) {
	var self = this;
	// Exposed api
	self.api = vn.attrs.api || {};
	self.api.play = function() { self.play && self.play(); };
	self.api.stop = function() { self.stop && self.stop(); };
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
	var xScale = d3.scaleLog()
		.domain(d3.extent(contracts.values))
		.domain([1,d3.max(contracts.values)])
		.range([10, width])
		.clamp(true)
		;
	var yScale = d3.scaleLog()
		.domain(d3.extent(members.values))
		.domain([1,d3.max(members.values)])
		.range([height, 10])
		.clamp(true)
		;
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
		.scale(xScale)
		.ticks(22, d3.format(".0s"))
		;
	var yAxis = d3.axisLeft()
		.scale(yScale)
		.ticks(22, d3.format('.0s'))
		;

	var axisLabelMargin = 6;

	// Create the SVG container and set the origin.
	var svg = d3.select(vn.dom).append("svg")
		.attr("width", width + margin.left + margin.right)
		.attr("height", height + margin.top + margin.bottom)
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
	view.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", width)
		.attr("y", height - axisLabelMargin)
		.text(vn.attrs.xlabel);

	// Add a y-axis label.
	view.append("text")
		.attr("class", "y label")
		.attr("text-anchor", "end")
		.attr("y", axisLabelMargin)
		.attr("dy", ".75em")
		.attr("transform", "rotate(-90)")
		.text(vn.attrs.ylabel);

	// Add grids
	var xGridAxis = d3.axisBottom()
		.scale(xScale)
		.ticks(22, d3.format(".0s"))
		.tickSize(-height, 0, 0)
		.tickFormat("")
		;
	var yGridAxis = d3.axisLeft()
		.scale(yScale)
		.ticks(22, d3.format('.0s'))
		.tickSize(-width, 0, 0)
		.tickFormat("")
		;
	view.append("g")
		.attr("class", "grid")
		.attr("transform", "translate(0," + height + ")")
		.call(xGridAxis)
		;
	view.append("g")         
		.attr("class", "grid")
		.call(yGridAxis)
		;

	// Add the year label; the value is set on transition.
	var label = view.append("text")
		.attr("class", "year label")
		.attr("text-anchor", "start")
		.attr("y", 120)
		.attr("x", 24)
		.text('2010-01');

	self.loadData = function() {
		// Add a dot per nation. Initialize the data at 1800, and set the colors.
		var dot = view.append("g")
            .attr("class", "dots")
			.selectAll(".dot")
            .data(interpolateData(new Date('2010-01-01')))
			.enter().append("circle")
				.attr("class", "dot")
				.style("fill", function(d) { return colorScale(color(d)); })
				.call(position)
				.sort(order);

		// Add a title.
		dot.append("title")
			.text(function(d) { return d.name; });

		// Add an overlay for the year label.
		var box = label.node().getBBox();

		var overlay = view.append("rect")
			.attr("class", "overlay")
			.attr("x", box.x)
			.attr("y", box.y)
			.attr("width", box.width)
			.attr("height", box.height)
			.on("mouseover", enableInteraction);

		// Start a transition that interpolates the data based on year.
		self.play = function() {
			self.stop();
			view.transition()
				.duration(60000)
				.ease(d3.easeLinear)
				.tween("year", tweenYear)
				.on("end", self.play);
			overlay.on("mouseover", enableInteraction);
		};
		self.stop = function() {
			view.transition().duration(0);
		};

		// Positions the dots based on data.
		function position(dot) {
			dot .attr("cx", function(d) { return xScale(x(d)); })
				.attr("cy", function(d) { return yScale(y(d)); })
				.attr("r", function(d) { return radiusScale(radius(d)); })
				;
		}

		// Defines a sort order so that the smallest dots are drawn on top.
		function order(a, b) {
			return radius(b) - radius(a);
		}

		// After the transition finishes, you can mouseover to change the year.
		function enableInteraction() {
			var yearScale = d3.scaleTime()
				.domain(timeBounds)
				.range([box.x + 10, box.x + box.width - 10])
				.clamp(true)
				;

			// Cancel the current transition, if any.
			self.stop();

			overlay
				.on("mouseover", mouseover)
				.on("mouseout", mouseout)
				.on("mousemove", mousemove)
				.on("touchmove", mousemove);

			function mouseover() {
				label.classed("active", true);
			}

			function mouseout() {
				label.classed("active", false);
			}

			function mousemove() {
				displayYear(yearScale.invert(d3.mouse(this)[0]));
			}
		}

		// Tweens the entire chart by first tweening the date, and then the data.
		// For the interpolated data, the dots and label are redrawn.
		function tweenYear() {
			var date = d3.interpolateDate(timeBounds[0], timeBounds[1]);
			return function(t) { displayYear(date(t)); };
		}

		// Updates the display to show the specified date.
		function displayYear(date) {
			var interpolatedData = interpolateData(date);
			dot.data(interpolatedData, key).call(position).sort(order);
			label.text(date.toISOString().slice(0,7));
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
	};
	self.loadData();
	self.play();
};

GapMinder.view = function(vn) {
	return m('.gapminder', vn.attrs);
};

GapMinder.Example = {};
GapMinder.Example.api = {};
GapMinder.Example.view = function(vn) {
	return m('', [
		m(GapMinder, {
			api: GapMinder.Example.api,
			xlabel: _("Contratos"),
			ylabel: _("Personas Socias"),
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
	]);
};


module.exports=GapMinder;

