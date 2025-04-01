(function(){

    var attrArray = ["Average Temp", "Max Temp", "Min Temp", "Precipitation", "Palmer Drought Severity Index"];
    var expressed = attrArray[0];

    window.onload = setMap;

    function setMap(){
        var containerWidth = document.getElementById("map-container").clientWidth,
            mapHeight = document.getElementById("map-container").clientHeight,
            chartHeight = document.getElementById("bar-chart-container").clientHeight;

        var map = d3.select("#map-container")
            .append("svg")
            .attr("class", "map")
            .attr("width", containerWidth)
            .attr("height", mapHeight);

        var projection = d3.geoConicEqualArea()
            .rotate([96, 0])
            .center([0, 37.5])
            .parallels([29.5, 45.5])
            .scale(1000)
            .translate([containerWidth / 2, mapHeight / 2]);

        var path = d3.geoPath().projection(projection);

        var graticule = d3.geoGraticule().step([5, 5]);

        var promises = [
            d3.csv("data/climate-data.csv"),
            d3.json("data/us-states.topojson"),
            d3.json("data/countries.topojson")
        ];

        Promise.all(promises).then(function(data){
            var csvData = data[0],
                usStates = data[1],
                countries = data[2];

            var usStatesFeatures = topojson.feature(usStates, usStates.objects.cb_2018_us_state_20m).features;
            var countriesFeatures = topojson.feature(countries, countries.objects.ne_10m_admin_0_countries).features;

            usStatesFeatures = usStatesFeatures.filter(d => d.properties.NAME !== "Alaska" && d.properties.NAME !== "Hawaii");

            usStatesFeatures = joinData(usStatesFeatures, csvData);

            var colorScale = makeColorScale(csvData);

            map.append("path")
                .datum(graticule.outline())
                .attr("class", "gratBackground")
                .attr("d", path);

            map.selectAll(".gratLines")
                .data(graticule.lines())
                .enter()
                .append("path")
                .attr("class", "gratLines")
                .attr("d", path);

            map.selectAll(".country")
                .data(countriesFeatures)
                .enter()
                .append("path")
                .attr("class", "country")
                .attr("d", path)
                .style("fill", "#ccc")
                .style("stroke", "#fff");

            setEnumerationUnits(usStatesFeatures, map, path, colorScale);

            setChart(csvData, colorScale);

        }).catch(function(error){
            console.log("Error loading data: ", error);
        });
    }

    function joinData(geojsonData, csvData){
        for (let i = 0; i < csvData.length; i++){
            var csvState = csvData[i];
            var csvKey = csvState.State;

            for (let j = 0; j < geojsonData.length; j++){
                var geoProps = geojsonData[j].properties;
                var geoKey = geoProps.NAME;

                if (geoKey === csvKey){
                    attrArray.forEach(function(attr){
                        geoProps[attr] = parseFloat(csvState[attr]);
                    });
                }
            }
        }
        return geojsonData;
    }

    function makeColorScale(data){
        var colorClasses = ["#D4B9DA", "#C994C7", "#DF65B0", "#DD1C77", "#980043"];

        var colorScale = d3.scaleQuantile().range(colorClasses);

        var domainArray = data.map(d => parseFloat(d[expressed])).filter(d => !isNaN(d));
        colorScale.domain(domainArray);

        return colorScale;
    }

    function setEnumerationUnits(geojsonData, map, path, colorScale){
        map.selectAll(".state")
            .data(geojsonData)
            .enter()
            .append("path")
            .attr("class", d => "state " + d.properties.NAME)
            .attr("d", path)
            .style("fill", d => {
                var val = d.properties[expressed];
                return val ? colorScale(val) : "#ccc";
            })
            .style("stroke", "#fff");
    }

    function setChart(csvData, colorScale){
        var containerWidth = document.getElementById("bar-chart-container").clientWidth,
            containerHeight = document.getElementById("bar-chart-container").clientHeight,
            leftPadding = 0.1,
            rightPadding = 0.1,
            topBottomPadding = 0.1,
            chartInnerWidth = containerWidth - leftPadding - rightPadding,
            chartInnerHeight = containerHeight - topBottomPadding * 2,
            translate = "translate(" + leftPadding + "," + topBottomPadding + ")";

        var chart = d3.select("#bar-chart-container")
            .append("svg")
            .attr("width", containerWidth)
            .attr("height", containerHeight)
            .attr("class", "chart");

        chart.append("rect")
            .attr("class", "chartBackground")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);

        var yScale = d3.scaleLinear()
            .range([chartInnerHeight, 0])
            .domain([0, d3.max(csvData, d => parseFloat(d[expressed]))]);

        var barWidth = chartInnerWidth / csvData.length;

        chart.selectAll(".bar")
            .data(csvData)
            .enter()
            .append("rect")
            .sort((a, b) => b[expressed] - a[expressed])
            .attr("class", d => "bar " + d.State)
            .attr("width", barWidth - 1)
            .attr("x", (d, i) => i * barWidth + leftPadding)
            .attr("height", d => chartInnerHeight - yScale(parseFloat(d[expressed])))
            .attr("y", d => yScale(parseFloat(d[expressed])) + topBottomPadding)
            .style("fill", d => colorScale(d[expressed]));

        chart.selectAll(".numbers")
            .data(csvData)
            .enter()
            .append("text")
            .sort((a, b) => b[expressed] - a[expressed])
            .attr("class", d => "numbers " + d.State)
            .attr("text-anchor", "middle")
            .attr("x", (d, i) => i * barWidth + leftPadding + (barWidth - 1) / 2)
            .attr("y", d => yScale(parseFloat(d[expressed])) + topBottomPadding + 15)
            .text(d => d[expressed]);

            chart.append("text")
            .attr("x", containerWidth / 2)
            .attr("y", 30)
            .attr("class", "chartTitle")
            .attr("text-anchor", "middle")
            .text("Average Temperature in each state in January 2025");

        chart.append("rect")
            .attr("class", "chartFrame")
            .attr("width", chartInnerWidth)
            .attr("height", chartInnerHeight)
            .attr("transform", translate);
    }

})();
