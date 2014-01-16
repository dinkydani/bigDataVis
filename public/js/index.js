
var sentimentChart = dc.pieChart("#sentiment-chart");

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
    //When a chart belongs to a specific group then any interaction with such chart will only trigger redraw on other charts within the same chart group.
    sentimentChart.width(180)
        .height(180)
        .radius(80)
        //.innerRadius(30)
        .dimension(sentimentDimension)
        .group(sentimentGroup);

	dc.dataCount(".dc-data-count")
        .dimension(ndx)
        .group(all);

    dc.renderAll();
    
	//$("#rawData").text(JSON.stringify(data));
});


