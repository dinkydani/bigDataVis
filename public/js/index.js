
var sentimentChart = dc.pieChart("#sentiment-chart");
var dayOfWeekChart = dc.rowChart("#day-of-week-chart");

d3.json('/findAll', function (data){
	//create crossfilter dimensions and groups
	var ndx = crossfilter(data);
    var all = ndx.groupAll();

    //summarize sentiment by polarity
    var sentimentDimension = ndx.dimension(function (d) {
    	if(d.polarity == 0)
    		return "Negative";
    	else if(d.polarity == 2)
    		return "Neutral";
    	else if(d.polarity == 4)
    		return "Positive";
    });

    var sentimentGroup = sentimentDimension.group();

    //Create a pie chart and use the given css selector as anchor.
    //You can also specify an optional chart group for this chart to be scoped within.
    //When a chart belongs to a specific group then any interaction with such chart will only trigger redraw on other charts
    //within the same chart group.
    sentimentChart.width(180)
        .height(180)
        .radius(80)
        //.innerRadius(30)
        .dimension(sentimentDimension)
        .group(sentimentGroup);
    



    var dayOfWeekDimension = ndx.dimension(function (d) {
        //"time" : "Sun Dec 08 11:10:03 +0000 2013"
        var format = d3.time.format("%a %b %d %H:%M:%S %Z %Y");
        var date = format.parse(d.tweet.time);
        var day = date.getDay();
        var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
        return days[day];;
    });

    var dayOfWeekGroup = dayOfWeekDimension.group();


    dayOfWeekChart.width(180)
        .height(180)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .group(dayOfWeekGroup)
        .dimension(dayOfWeekDimension)
        .elasticX(true)
        .xAxis().ticks(4);

    // dateChart.width(500)
    //     .height(60)
    //     //.margins({top: 0, right: 50, bottom: 20, left: 40})
    //     .dimension(dateDimension)
    //     .group(volumeByDay)
    //     .centerBar(true)
    //     .gap(1)
    //     .x(d3.time.scale().domain([new Date(1985, 0, 1), new Date(2012, 11, 31)]))
    //     //.round(d3.time.month.round)
    //     //.alwaysUseRounding(true)
    //     .xUnits(d3.time.days);

	dc.dataCount(".dc-data-count")
        .dimension(ndx)
        .group(all);

    dc.renderAll();
    
	//$("#rawData").text(JSON.stringify(data));
});
