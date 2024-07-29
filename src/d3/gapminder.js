import * as d3 from 'd3'
import '../gapminder.styl'
import {t} from 'i18next'
import OpenData from '../services/opendata'

const Gapminder = {};

Gapminder.oninit = function(setPlaying) {
	var self = this;
	self.api = true
	self.notifyPlaying=setPlaying
	// Which data attributes map to visualization domain
	self.parameters = {
		x: 'members',
		y: 'contracts',
		r: 'members_change',
		color: 'code',
//		key: 'parent', // Useful to identify provinces of the same CCAA
		key: 'code',
		name: 'name',
	};
};

Gapminder.oncreate = function(container) {
	var self = this;

	// Mapping datum attributes to visualization domain
	const key = (d) => d[self.parameters.key]
	const name = (d) => d[self.parameters.name]
	const color = (d) => d[self.parameters.color]
	const x = (d) => d[self.parameters.x]
	const y = (d) => d[self.parameters.y]
	const radius = (d) => d[self.parameters.r]

	const svg = d3.select(container).append("svg")
		.attr("width", "100%")
		.attr("height", "99%")

	var margin = {top: 19.5, right: 19.5, bottom: 19.5, left: 39.5};
	self.computeSize = function() {
		const elementWidth = svg.node().clientWidth
		const elementHeight = svg.node().clientHeight
		self.width = elementWidth - margin.right - margin.left;
		self.height = elementHeight - margin.top - margin.bottom;
	}
	self.computeSize()

	// Chart dimensions.

	// Symlog patch to ticks to workaround
	// bug https://github.com/d3/d3-scale/issues/162
	function fixTicks(symlogScale) {
		symlogScale.ticks=(n)=>{
			const d = symlogScale.domain()
			const min = Math.min(...d)
			const max = Math.max(...d)
			function p(desc, x) {
				//console.log({n,desc,d,min,max, x})
				return x
			}
			if (min>0 ) return p("pos", d3.scaleLog(d, [0,1]).ticks(n))
			if (max<0) return p("neg", d3.scaleLog(d.map(x=>-x), [0,1]).ticks(n).reverse().map(x=>-x))
			if (n===undefined) n=10
			const negRange = min>-1? [] : d3.scaleLog([-min, 1], [0,1]).ticks(n/4).map(x=>-x).reverse()
			const posRange = max<+1? [] : d3.scaleLog([1, max], [0,1]).ticks(n/4)
			return p("zero", [...negRange , 0, ...posRange ])
		}
		symlogScale.tickFormat = (count, specifier) => {
			return (d)=>
				d>0? d3.scaleLog([1,Math.max(symlogScale.domain())], [0,1]).tickFormat(count, specifier)(d):
				d<0?"-"+d3.scaleLog([-Math.min(symlogScale.domain()),1], [0,1]).tickFormat(count, specifier)(-d):
					0
		}

		return symlogScale
	}

	// Various scales. These domains make assumptions of data, naturally.
	var xScaleLog = fixTicks(d3.scaleSymlog())
		.domain([1,200000])
		.range([10, self.width])
		.clamp(true)
		;
	var xScaleLinear = d3.scaleLinear()
		.domain([0,200000])
		.range([10, self.width])
		.clamp(true)
		;
	self.xScale = xScaleLog;

	var yScaleLog = fixTicks(d3.scaleSymlog())
		.domain([1,200000])
		.range([self.height, 10])
		.clamp(true)
		;
	var yScaleLinear = d3.scaleLinear()
		.domain([0,200000])
		.range([self.height, 10])
		.clamp(true)
		;
	self.yScale = yScaleLog;

	var radiusScale = d3.scaleSqrt()
		.domain([1,200000])
		.range([3, 60])
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

	var view = svg.append("g")
		.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

	// Add the x-axis.
	var xAxisContainer = view.append("g")
		.attr("class", "x axis")
		.attr("transform", "translate(0," + self.height + ")")
	xAxisContainer
		.call(xAxis);

	// Add the y-axis.
	view.append("g")
		.attr("class", "y axis")
		.call(yAxis);

	// Add an x-axis label.
	self.xLabel = view.append("text")
		.attr("class", "x label")
		.attr("text-anchor", "end")
		.attr("x", self.width)
		.attr("y", self.height - axisLabelMargin)
		.text(OpenData.metricText(self.parameters.x));

	// Add a y-axis label.
	self.yLabel = view.append("text")
		.attr("class", "y label")
		.attr("text-anchor", "start")
		.attr("x", -3*margin.left/4)
		.attr("y", 0)
		.text(OpenData.metricText(self.parameters.y));

	// Add a y-axis label.
	const legendRadius=5
	self.rLabel = view.append("text")
		.attr("class", "r label")
		.attr("text-anchor", "end")
		.attr("x", self.width-legendRadius*2-2)
		.attr("y", 0)
		.text(OpenData.metricText(self.parameters.r));
	self.rLabelIcon = view.append("circle")
		.attr("class", "r label")
		.attr("cx", self.width-legendRadius)
		.attr("cy", -legendRadius)
		.attr("r", legendRadius)

	// Add grids
	var xGridAxis = d3.axisBottom()
		.scale(xScaleLog)
		.ticks(22, d3.format(".0s"))
		.tickSize(-self.height, 0, 0)
		.tickFormat("")
		;
	var xGridAxisLinear = d3.axisBottom()
		.scale(xScaleLinear)
		.ticks(22, d3.format(".0s"))
		.tickSize(-self.height, 0, 0)
		.tickFormat("")
		;
	var yGridAxis = d3.axisLeft()
		.scale(self.yScale)
		.ticks(22, d3.format('.0s'))
		.tickSize(-self.width, 0, 0)
		.tickFormat("")
		;
	var xGridContainer = view.append("g")
		.attr("class", "grid x")
		.attr("transform", "translate(0," + self.height + ")")
	xGridContainer
		.call(xGridAxis)
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

	self.timeBounds = d3.extent(OpenData.dates());
	self.dateScale = d3.scaleTime()
		.domain(self.timeBounds)
		.range([dateBox.x + 10, dateBox.x + dateBox.width - 10])
		.clamp(true)
		;

	var dateAxis = d3.axisBottom()
		.scale(self.dateScale)
		;
	// Add the date-axis.
	view.append("g")
		.attr("class", "time axis")
		.attr("transform", "translate(0," + 10 + ")")
		.call(dateAxis);

	timePoint
		.attr('class', 'timepointer')
		.attr('x1', self.dateScale(self.currentDate))
		.attr('x2', self.dateScale(self.currentDate))
		.attr('y1', dateBox.y)
		.attr('y2', dateBox.y+dateBox.height)
		.style('stroke', 'red')
		;

	// Moving dots
	var dots = view.append("g")
		.attr("class", "dots")
	;

	var currentInfo = view.append('foreignObject')
		.attr('class', 'currentInfo')
		.attr('x', self.width-200)
		.attr('y', self.height-56)
		.attr('width', '20em')
		.attr('height', self.height/3)
		.style('display', 'none')
		;
	currentInfo.append('xhtml:div')
		.attr('class', 'currentInfoContent')
		;

	self.resize = function() {
		self.computeSize()
		xScaleLog.range([10, self.width])
		xScaleLinear.range([10, self.width])
		yScaleLog.range([self.height, 10])
		yScaleLinear.range([self.height, 10])
		xAxisContainer
			.attr("transform", "translate(0," + self.height + ")")
		self.xLabel
			.attr("x", self.width)
			.attr("y", self.height - axisLabelMargin)
		xGridAxis
			.tickSize(-self.height, 0, 0)
		xGridAxisLinear
			.tickSize(-self.height, 0, 0)
		yGridAxis
			.tickSize(-self.width, 0, 0)
		xGridContainer
			.attr("transform", "translate(0," + self.height + ")")
		self.rLabel
			.attr("x", self.width-legendRadius*2-2)
		self.rLabelIcon
			.attr("cx", self.width-legendRadius)
		animateAxis();
	}
	self.setXMetric = function(metric) {
		self.parameters.x = metric;
		self.xLabel.text(OpenData.metricText(metric));
		var [min, max] = OpenData.metricExtents[metric]??[0,100]
		xScaleLog.domain([min,max]);
		xScaleLinear.domain([min, max]);
		resetXAxis(self.xScale);
	};
	self.setYMetric = function(metric) {
		self.parameters.y = metric;
		self.yLabel.text(OpenData.metricText(metric));
		var [min, max] = OpenData.metricExtents[metric]??[0,100]
		yScaleLog.domain([min,max]);
		yScaleLinear.domain([min, max]);
		resetYAxis(self.yScale);
	};
	self.setRMetric = function(metric) {
		var [min, max] = OpenData.metricExtents[metric]??[0,100]
		self.rLabel.text(OpenData.metricText(metric))
		radiusScale.domain([0,max])
		self.parameters.r = metric;
		displayDate(self.currentDate);
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
	self.resetTimeAxis = function() {
		resetTimeAxis();
	}
	function resetXAxis(scale) {
		self.xScale = scale;
		xGridAxis.scale(self.xScale);
		xAxis.scale(self.xScale);
		animateAxis()
	}
	function resetYAxis(scale) {
		self.yScale = scale;
		yGridAxis.scale(self.yScale);
		yAxis.scale(self.yScale);
		animateAxis()
	}
	function animateAxis() {
		d3.select(".axis.x")
			.transition()
			.call(xAxis)
			;
		d3.select(".grid.x")
			.transition()
			.call(xGridAxis)
			;
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
	function resetTimeAxis(scale) {
		self.pause && self.pause();
		self.timeBounds = d3.extent(OpenData.dates());
		console.log("resetTimeAxis", self.timeBounds[0]);
		self.dateScale.domain(self.timeBounds);
		dateAxis.scale(self.dateScale);
		// Add the date-axis.
		d3.select(".time.axis")
			.call(dateAxis);
		displayDate(self.timeBounds[0]);
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
	function hideCurrentDot(ev, data) {
		currentInfo.style('display', 'none');
	}
	function showCurrentDot(ev, data) {
		const cursorSize = 20;
		const infoWidth = 300; // TODO: Should be 20em as the css .currentInfo width
		const infoHeight = 120; // TODO: Should be ...whatever it is
		currentInfo.style('display', 'block');
		var coordinates = d3.pointer(ev, this);
		var x = coordinates[0]+20;
		if (x+infoWidth>self.width) {
			x = self.width - infoWidth;
		}
		var y = coordinates[1]+20;
		if (y+infoHeight>self.height)
			y = self.height - infoHeight;
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
			"<div><b>"+t("TOOLTIP_MONTH")+":</b> "+
			self.currentDate.toISOString().slice(0,7)+
			"</div>"+
			"<div><b>"+OpenData.metricText(self.parameters.x)+":</b> "+
			Math.round(data[self.parameters.x])+
			"</div>"+
			"<div><b>"+OpenData.metricText(self.parameters.y)+":</b> "+
			Math.round(data[self.parameters.y])+
			"</div>"+
			"<div><b>"+OpenData.metricText(self.parameters.r)+":</b> "+
			Math.round(data[self.parameters.r])+
			"</div>"+
			""
		);
	}

	// Updates the display to show the specified date.
	function displayDate(date) {
		self.currentDate=date;
		var dot = dots
			.selectAll(".dot")
			.data(interpolateData(date), key)
		;
		dot
			.enter().append("circle")
				.attr("class", "dot")
				.style("fill", d => colorScale(color(d)))
				.on('mouseover', showCurrentDot)
				.on('mousemove', showCurrentDot)
				.on('mouseout', hideCurrentDot)
		;
		dot
			.exit().remove()
		;
		dots
			.selectAll(".dot")
			.data(interpolateData(date), key)
			.call(position)
			.sort(order)
		;
		var dateText = date? date.toISOString().slice(0,7):'0000-00-00';
		dateLabel.text(dateText);
		timePoint
			.attr('x1', self.dateScale(self.currentDate))
			.attr('x2', self.dateScale(self.currentDate))
			;

	}

	self.setXMetric('members');
	self.setYMetric('contracts');
	self.setRMetric('members_change');
	self.resetTimeAxis();

	// Interpolates the dataset for the given date.
	function interpolateData(date) {
		return OpenData.interpolateDate(date);
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
			.on("mouseover", dragDate);

		// Start a transition that interpolates the data based on date.
		self.replay = function() {
			self.pause();
			displayDate(self.timeBounds[0]);
			self.play();
		};
		self.play = function() {
			self.pause();
			var remainingFactor = (self.timeBounds[1]-self.currentDate)/(
				self.timeBounds[1]-self.timeBounds[0]);
			view.transition()
				.ease(d3.easeLinear)
				.tween("dateplay", function() {
					var date = d3.interpolateDate(self.currentDate, self.timeBounds[1]);
					return function(t) { displayDate(date(t)); };
				})
				.on("end", self.replay)
				.duration(60000*remainingFactor)
			;
			overlay.on("mouseover", dragDate);
		};
		self.externalPlay = function(playing) {
			const isPaused = view.transition().duration()<3000
			console.log("duration", view.transition().duration())
			if (playing && isPaused) return self.play()
			if (!playing && !isPaused) return self.pause()
		}
		self.pause = function() {
			console.log("Paused at", self.currentDate);
			view.transition().duration(0);
		};

		// After the transition finishes, you can mouseover to change the date.
		function dragDate() {
			// Cancel the current transition, if any.
			self.pause();
			self.notifyPlaying(false)

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

			function mousemove(ev) {
				displayDate(self.dateScale.invert(d3.pointer(ev,this)[0]));
			}
		}
		self.play()
		self.notifyPlaying(true)
	};
	//self.pause();
	self.loadData();
};

export default Gapminder

// vim: noet ts=2 sw=2
