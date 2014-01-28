//$("#overlay").show();


var sentimentChart = dc.pieChart("#sentiment-chart");
var dayOfWeekChart = dc.rowChart("#day-of-week-chart");
var countryChart = dc.pieChart("#country-chart");
//var countryRowChart = dc.rowChart("#country-row-chart"); //TODO: long row chart down size for countries?
var choroplethChart = dc.geoChoroplethChart("#choropleth-chart");

var markers = []; //markers array for handling map zoom
var days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
//var coloursBlue = ['#084594', '#2171b5', '#4292c6', '#6baed6', '#9ecae1', '#c6dbef', '#eff3ff']; //darkest to lightest
var coloursBlue = ['#3182bd', '#6baed6', '#9ecae1', '#c6dbef', '#dadaeb', '#c6dbef', '#eff3ff']; //first 5 default dc.js colours

var dateTimeFormat = d3.time.format("%a %b %d %H:%M:%S %Z %Y");

var countryCounts = [];
var choroplethGrades = [0, 10, 20, 50, 100, 200, 500, 1000];

d3.json('/findAll', function (data){
	//create crossfilter dimensions and groups
	var ndx = crossfilter(data);
    var all = ndx.groupAll();





    /*SENTIMENT CHART*/
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
    //When a chart belongs to a specific group then any interaction with such chart will only trigger redrawSVG on other charts
    //within the same chart group.
    sentimentChart.width(180)
        .height(180)
        .radius(80)
        .innerRadius(30)
        .dimension(sentimentDimension)
        .group(sentimentGroup)
        .title(function (d){
            return d.key + "(" + Math.floor(d.value / all.value() * 100) + "%)";
        })
        .on("filtered", redrawSVG);
    



    /*DAY OF THE WEEK CHART*/
    var dayOfWeekDimension = ndx.dimension(function (d) {
        var date = dateTimeFormat.parse(d.tweet.time);
        return days[date.getDay()];
    });

    var dayOfWeekGroup = dayOfWeekDimension.group();


    dayOfWeekChart.width(180)
        .height(180)
        .margins({top: 20, left: 10, right: 10, bottom: 20})
        .group(dayOfWeekGroup)
        .dimension(dayOfWeekDimension)
        .ordinalColors(coloursBlue)
        .on("filtered", redrawSVG)
        .elasticX(true)
        .xAxis().ticks(4);
        




    /* COUNTRY CHART*/
    var countryDimension = ndx.dimension(function (d){
        return d.tweet.geo.place.country_code;
    });

    var countryGroup = countryDimension.group();

    countryChart.width(180)
        .height(180)
        .radius(80)
        .dimension(countryDimension)
        .group(countryGroup)
        .title(function (d){
            return d.key + ": " + d.value + " (" + Math.floor(d.value / all.value() * 100) + "%)";
        })
        .on("filtered", redrawSVG);
        

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


    /* DATA COUNT*/
	dc.dataCount(".dc-data-count")
        .dimension(ndx)
        .group(all);

    


    /*LEAFLET PLOTTED MAP*/
    //create the map and start in London
    var map = L.map('plotted-map').setView([51.505, -0.09], 2);

    var osmUrl = 'http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    var attribText = 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors';
    //add tile layer
    L.tileLayer(osmUrl, {
        attribution: attribText,
        minZoom: 1,
        maxZoom: 16
    }).addTo(map);

    data.forEach(function (d){
        //make a new marker for each tweet and get the icon based on polarity
        var marker = L.marker(d.tweet.geo.geo.coordinates, {icon: getIcon(d.polarity) });
        marker.bindPopup(d.text);
        marker.on('click', function(e){
            marker.openPopup();
        });
        marker.addTo(map);
        //push to markers array for zoom
        markers.push(marker);
    });

    //set event handler for when the map has been zoomed in/out
    map.on("zoomend", function(){
        var currentZoom = map.getZoom();
        //set the size of the icon 3 times the current zoom level which starts at 2 and icon size 8
        //this gives a sensible size icon
        var size = currentZoom * 3;
        var newIconSize = [size, size];
        for (var i = 0; i < markers.length; i++) {
            //get the existing marker image
            var url = markers[i].options.icon.options.iconUrl;
            var newIcon = L.icon({
                iconUrl: url,
                iconSize: newIconSize
            });
            markers[i].setIcon(newIcon);
        }
    });



    /*Choropleth Map*/
    //setup the data
    for (var i = 0; i < countryDimension.group().all().length; i++) {
        for (var j = 0; j < countriesJson.features.length; j++) {
            if(countryDimension.group().all()[i].key == countriesJson.features[j].properties.ISO_A2){
                countriesJson.features[j].properties.tweetCount = countryDimension.group().all()[i].value;
                break;
            }
        };
    };


    //setup the map
    var cMap = L.map('choropleth-map').setView([51.505, -0.09], 2);

    L.tileLayer(osmUrl, {
        attribution: attribText,
        minZoom: 1,
        maxZoom: 16
    }).addTo(cMap);

    var geojson = L.geoJson(countriesJson, {
        style: styleChoropleth,
        onEachFeature: onEachFeature
    }).addTo(cMap);

    var infoPanel = L.control();

    infoPanel.onAdd = function (map) {
        this._div = L.DomUtil.create('div', 'infoPanel'); // create a div with a class "infoPanel"
        this.update();
        return this._div;
    };

    // method that we will use to update the control based on feature properties passed
    infoPanel.update = function (properties) {
        this._div.innerHTML = '<h4>Number of Tweets</h4>' +  (properties ?
            '<b>' + properties.NAME + '</b><br />' + properties.tweetCount + ' tweets'
            : 'Click or hover on a country');
    };

    infoPanel.addTo(cMap);
    
    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'infoPanel legend');
        var labels = [];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < choroplethGrades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getChoroplethColor(choroplethGrades[i] + 1) + '"></i> ' +
                choroplethGrades[i] + (choroplethGrades[i + 1] ? '&ndash;' + choroplethGrades[i + 1] + '<br>' : '+');
        }

        return div;
    };

    legend.addTo(cMap);




    /*DC.js CHOROPLETH-CHART*/
    var choroplethDimension = ndx.dimension(function (d){
        return d.tweet.geo.place.country_code;
    });

    var choroplethGroup = choroplethDimension.group();


    choroplethChart
        .width(1000)
        .height(450)
        .dimension(choroplethDimension)
        .group(choroplethGroup)
        .projection(d3.geo.mercator()
            .scale(100)
            .center([0, 40]))
        .colors(d3.scale.quantize().range(["#E2F2FF", "#C4E4FF", "#9ED2FF", "#81C5FF", "#6BBAFF", "#51AEFF", "#36A2FF", "#1E96FF", "#0089FF", "#0061B5"]))
        .colorDomain([0, 200])
        .colorCalculator(function (d) { return d ? choroplethChart.colors()(d) : '#ccc'; })
        .overlayGeoJson(countriesJson.features, "state", function (d) {
            return d.properties.ISO_A2;
        })
        .title(function (d) {
            var tweets = d.value ? d.value : 0;
            return "Country: " + d.key + "\nTweets: " + tweets;
        });








    /*D3 & Leaflet CHOROPLETH MAP*/
    var mapCountryDimension = ndx.dimension(function (d){
        return d.tweet.geo.place.country_code;
    });

    //setup the map
    var d3map = L.map('d3-map').setView([51.505, -0.09], 2);

    L.tileLayer(osmUrl, {
        attribution: attribText,
        minZoom: 1,
        maxZoom: 16
    }).addTo(d3map);


    var svg = d3.select(d3map.getPanes().overlayPane).append("svg"),
        g = svg.append("g").attr("class", "leaflet-zoom-hide");

    var transform = d3.geo.transform({point: projectPoint}),
        path = d3.geo.path().projection(transform),
        bounds = path.bounds(countriesJson);

    // colour ramp, a range of colours red to blue using a scale from 0 to the max tweet count
    //var ramp = d3.scale.linear().domain([0,mapCountryDimension.group().top(1)]).range(["red","blue"]);

    feature = g.selectAll("path")
        .data(countriesJson.features)
        .enter().append("path")
        .on("click", countryClicked);
        // default fill
        // .style("fill", function (d){
                  
        // });      

    d3map.on("viewreset", resetSVG);
    d3map.on("moveend", resetSVG);

    redrawSVG();
    resetSVG();
    

    var mapFilterDimension = ndx.dimension(function (d){
        return d.tweet.geo.place.country_code;
    });
    var selectedCountries = [];

    function countryClicked(country){
        //check if the country is already selected
        var inArray = false;

        if (selectedCountries.indexOf(country) > -1) {
            inArray = true;
            selectedCountries.splice(selectedCountries.indexOf(country), 1); 
        }

        if(!inArray){
            selectedCountries.push(country);
        }

        if(selectedCountries.length > 0){
            //set all the countries to default grey
            g.selectAll("path")
                .style("fill", "#ccc");

            //set the index for reference later
            var d = mapCountryDimension.group().all();

            var indexed = {};
            for (var i = 0; i < d.length; i++) {
                indexed[d[i].key] = d[i].value;
            }

            //filter the path based on the clicked country
            g.selectAll("path")
                // .filter(function (d){
                //     return country == d;
                // })
                .style('fill', function (d) {
                    if (selectedCountries.indexOf(d) > -1) {
                      return getChoroplethColorBlue(indexed[d.properties.ISO_A2]) }
                    else { 
                      return '#ccc';
                    }
                });

            //mapCountryDimension.filter(selectedCountries);
            var query = [{"key":"AT"}, {"key":"US"}];

            var f = mapFilterDimension.filter(function(d) {
                for (var i = 0; i < selectedCountries.length; i++) { 
                    return selectedCountries[i].properties.ISO_A2 === d;
                }
            });

            console.log(f.top(Infinity));

        } else {
            redrawSVG();
        }

    }

    // call when the filter changes
    function redrawSVG () {
        // group() returns the data currently left after the filter in applied elsewhere
        var d = mapCountryDimension.group().all();

        // this indexes the country by name so we can look it up later
        var indexed = {};
        for (var i = 0; i < d.length; i++) {
          indexed[d[i].key] = d[i].value;
        }
      
        // select all the country paths again
        g.selectAll('path')
            .style('fill', function (d) {
                // this time look up the tweet count from the indexed cf group
                var count = indexed[d.properties.ISO_A2];
                // make a colour from the count and return that as the fill
                return getChoroplethColorBlue(count);       
        })
    }

    function projectPoint(x, y) {
        var point = d3map.latLngToLayerPoint(new L.LatLng(y, x));
        this.stream.point(point.x, point.y);
    }

    // Reposition the SVG to cover the features.
    function resetSVG() {
        var topLeft = bounds[0],
            bottomRight = bounds[1];

        svg.attr("width", bottomRight[0] - topLeft[0])
           .attr("height", bottomRight[1] - topLeft[1])
           .style("left", topLeft[0] + "px")
           .style("top", topLeft[1] + "px");

        g.attr("transform", "translate(" + -topLeft[0] + "," + -topLeft[1] + ")");

        feature.attr("d", path);
    }

    
    function styleChoropleth(feature) {
        return {
            fillColor: getChoroplethColor(feature.properties.tweetCount),
            weight: 1.5,
            opacity: 1,
            color: 'white',
            dashArray: '3',
            fillOpacity: 0.7
        };
    }

    function getChoroplethColor(d) {
        //TODO: adjust the colours and decide values
        //Math.floor(d.value / all.value() * 100)

        return d > choroplethGrades[6] ? '#800026' :
               d > choroplethGrades[5] ? '#BD0026' :
               d > choroplethGrades[4] ? '#E31A1C' :
               d > choroplethGrades[3] ? '#FC4E2A' :
               d > choroplethGrades[2] ? '#FD8D3C' :
               d > choroplethGrades[1] ? '#FEB24C' :
               d > choroplethGrades[0] ? '#FED976' :
                                         '#FFEDA0';
    }
    function getChoroplethColorBlue(d){
        return d > choroplethGrades[6] ? '#0061B5' :
               d > choroplethGrades[5] ? '#1E96FF' :
               d > choroplethGrades[4] ? '#36A2FF' :
               d > choroplethGrades[3] ? '#51AEFF' :
               d > choroplethGrades[2] ? '#81C5FF' :
               d > choroplethGrades[1] ? '#9ED2FF' :
               d > choroplethGrades[0] ? '#C4E4FF' :
                                         '#ccc';
    }

    function highlightFeature(e) {
        var layer = e.target;

        layer.setStyle({
            weight: 3,
            color: '#666',
            dashArray: '',
            fillOpacity: 0.7
        });

        if (!L.Browser.ie && !L.Browser.opera) {
            layer.bringToFront();
        }
        infoPanel.update(layer.feature.properties);
    }

    function resetHighlight(e) {
        geojson.resetStyle(e.target);
        infoPanel.update();
    }

    function onEachFeature(feature, layer) {
        layer.on({
            click: function(){
                infoPanel.update(layer.feature.properties);
            },
            mouseover: highlightFeature,
            mouseout: resetHighlight,
        });
    }



    // startRendering(function (){
    //     $("#overlay").hide();
    // });



    //last line
    dc.renderAll();
        
});
function startRendering(callback){ 
    callback();
}

//returns the correct icon depending on polarity
function getIcon(polarity){
    if(polarity == 0){
        return L.icon({
            iconUrl: "/imgs/negative.png",
            iconSize: [8, 8]
        });
    }
    else if(polarity == 2){
        return L.icon({
            iconUrl: "/imgs/neutral.png",
            iconSize: [8, 8]
        });
    }
    else if(polarity == 4){
        return L.icon({
            iconUrl: "/imgs/positive.png",
            iconSize: [8, 8]
        });
    }
}