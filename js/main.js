(function() {
    //Define the available attributes to visualize
    const attrArray = [
        "Average Temp",
        "Max Temp",
        "Min Temp",
        "Precipitation",
        "Palmer Drought Severity Index"
    ];
    let expressed = attrArray[0]; //Default attribute

    window.onload = setMap; //Run setMap when page loads

    function setMap() {
        //Get dimensions of map container
        const containerWidth = document.getElementById("map-container").clientWidth;
        const containerHeight = document.getElementById("map-container").clientHeight;

        //Create the SVG element for the map
        const map = d3.select("#map-container").append("svg")
            .attr("class", "map")
            .attr("width", containerWidth)
            .attr("height", containerHeight);

        //Set up Albers USA projection
        const projection = d3.geoConicEqualArea()
            .rotate([96, 0])
            .center([0, 37.5])
            .parallels([29.5, 45.5])
            .scale(1)
            .translate([0, 0]);

        let path = d3.geoPath().projection(projection); //Path generator
        const graticule = d3.geoGraticule().step([5, 5]); //Graticule lines

        //Load CSV and TopoJSON data
        const promises = [
            d3.csv("data/climate-data.csv"),
            d3.json("data/us-states.topojson"),
            d3.json("data/countries.topojson")
        ];

        Promise.all(promises).then(callback); //Once data is loaded, run callback

        function callback([csvData, usStates, countries]) {
            //Convert TopoJSON to GeoJSON features
            let usStatesFeatures = topojson.feature(usStates, usStates.objects.cb_2018_us_state_20m).features;
            const countriesFeatures = topojson.feature(countries, countries.objects.ne_10m_admin_0_countries).features;

            //Filter out Alaska and Hawaii
            usStatesFeatures = usStatesFeatures.filter(d => !["Alaska", "Hawaii"].includes(d.properties.NAME));

            //Calculate appropriate scale and translation
            const bounds = path.bounds({type: "FeatureCollection", features: usStatesFeatures});
            const scale = 0.95 / Math.max(
                (bounds[1][0] - bounds[0][0]) / containerWidth,
                (bounds[1][1] - bounds[0][1]) / containerHeight
            );
            const translate = [
                (containerWidth - scale * (bounds[1][0] + bounds[0][0])) / 2,
                (containerHeight - scale * (bounds[1][1] + bounds[0][1])) / 2
            ];

            projection.scale(scale).translate(translate); //Update projection
            path = d3.geoPath().projection(projection); //Update path

            //Add graticule background
            map.append("path")
                .datum(graticule.outline())
                .attr("class", "gratBackground")
                .attr("d", path);

            //Add graticule lines
            map.selectAll(".gratLines")
                .data(graticule.lines())
                .enter().append("path")
                .attr("class", "gratLines")
                .attr("d", path);

            //Draw country outlines
            map.selectAll(".country")
                .data(countriesFeatures)
                .enter().append("path")
                .attr("class", "country")
                .attr("d", path)
                .style("fill", "#ccc")
                .style("stroke", "#fff");

            //Join CSV data to states
            usStatesFeatures = joinData(usStatesFeatures, csvData);

            //Create initial color scale
            let colorScale = makeColorScale(csvData);

            //Set dropdown menu and draw views
            setDropdown(csvData, usStatesFeatures, map, path);
            drawMap(usStatesFeatures, map, path, colorScale);
            drawBarChart(csvData, colorScale);
        }
    }

    //Join CSV values to GeoJSON features
    function joinData(geojsonData, csvData) {
        csvData.forEach(row => {
            const csvKey = row.State;
            geojsonData.forEach(feature => {
                if (feature.properties.NAME === csvKey) {
                    attrArray.forEach(attr => {
                        feature.properties[attr] = parseFloat(row[attr]);
                    });
                }
            });
        });
        return geojsonData;
    }

    //Create a quantile color scale
    function makeColorScale(data) {
        const colorClasses = ["#D4B9DA", "#C994C7", "#DF65B0", "#DD1C77", "#980043"];
        const scale = d3.scaleQuantile().range(colorClasses);
        const domain = data.map(d => parseFloat(d[expressed])).filter(d => !isNaN(d));
        scale.domain(domain);
        return scale;
    }

    //Create and populate the dropdown menu
    function setDropdown(csvData, geojsonData, map, path) {
        const dropdown = d3.select("#attributeSelect");
        dropdown.selectAll("option")
            .data(attrArray)
            .enter()
            .append("option")
            .attr("value", d => d)
            .text(d => d);

        //Update visuals when user selects a new variable
        dropdown.on("change", function() {
            expressed = this.value;
            const colorScale = makeColorScale(csvData);
            updateMap(map, colorScale);
            updateChart(csvData, colorScale);
        });
    }

    //Draw the choropleth map
    function drawMap(geojsonData, map, path, colorScale) {
        map.selectAll(".state")
            .data(geojsonData)
            .enter()
            .append("path")
            .attr("class", d => "state " + d.properties.NAME.replace(/\s/g, "_"))
            .attr("d", path)
            .style("fill", d => {
                const val = d.properties[expressed];
                return val ? colorScale(val) : "#ccc";
            })
            .style("stroke", "#fff")
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveTooltip);
    }

    //Draw the initial bar chart
    function drawBarChart(csvData, colorScale) {
        const container = d3.select("#bar-chart-container");
        const w = container.node().clientWidth;
        const h = container.node().clientHeight;
        const padding = {top: 40, right: 10, bottom: 50, left: 40};

        const svg = container.append("svg")
            .attr("class", "chart")
            .attr("width", w)
            .attr("height", h);

        svg.append("g").attr("class", "bars");

        svg.append("text")
            .attr("class", "chartTitle")
            .attr("x", w / 2)
            .attr("y", 20)
            .attr("text-anchor", "middle")
            .text(`${expressed} by State`);

        updateChart(csvData, colorScale);
    }

    //Update choropleth fill colors
    function updateMap(map, colorScale) {
        map.selectAll(".state")
            .transition()
            .duration(1000)
            .style("fill", d => {
                const val = d.properties[expressed];
                return val ? colorScale(val) : "#ccc";
            });
    }

    //Update the bar chart when a new attribute is selected
    function updateChart(csvData, colorScale) {
        //Sort the data by value
        csvData.sort((a, b) => parseFloat(b[expressed]) - parseFloat(a[expressed]));

        const svg = d3.select(".chart");
        const bars = svg.select(".bars");

        const w = +svg.attr("width");
        const h = +svg.attr("height");
        const padding = {top: 40, right: 10, bottom: 50, left: 40};

        const x = d3.scaleBand()
            .range([padding.left, w - padding.right])
            .padding(0.1)
            .domain(csvData.map(d => d.State));

        const y = d3.scaleLinear()
            .range([h - padding.bottom, padding.top])
            .domain([0, d3.max(csvData, d => parseFloat(d[expressed]))]);

        //Clear old bars and labels
        bars.selectAll("rect").remove();
        bars.selectAll("text").remove();

        //Add updated bars
        bars.selectAll("rect")
            .data(csvData, d => d.State)
            .enter()
            .append("rect")
            .attr("x", d => x(d.State))
            .attr("y", d => y(d[expressed]))
            .attr("height", d => h - padding.bottom - y(d[expressed]))
            .attr("width", x.bandwidth())
            .attr("class", d => "bar " + d.State.replace(/\s/g, "_"))
            .style("fill", d => colorScale(d[expressed]))
            .on("mouseover", highlight)
            .on("mouseout", dehighlight)
            .on("mousemove", moveTooltip);

       

        //Update chart title
        svg.select(".chartTitle").text(`${expressed} by State`);
    }

    //Highlight function for map and chart
    function highlight(event, d) {
        const stateName = d.properties ? d.properties.NAME : d.State;
        d3.selectAll("." + stateName.replace(/\s/g, "_")).classed("highlight", true);

        const tooltip = d3.select("#tooltip");
        tooltip.style("opacity", 1)
            .html(`<strong>${stateName}</strong><br>${expressed}: ${d.properties ? d.properties[expressed] : d[expressed]}`);
    }

    //Remove highlight
    function dehighlight(event, d) {
        const stateName = d.properties ? d.properties.NAME : d.State;
        d3.selectAll("." + stateName.replace(/\s/g, "_")).classed("highlight", false);
        d3.select("#tooltip").style("opacity", 0);
    }

    //Move tooltip with mouse
    function moveTooltip(event) {
        d3.select("#tooltip")
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 30) + "px");
    }

})();
