import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import './App.css';
import * as d3 from 'd3';

const App = () => {
    const [selectedDate, setSelectedDate] = useState(null);
    const [features, setFeatures] = useState([]);
    const [keys, setKeys] = useState([]);
    const [selectedFeatureData, setSelectedFeatureData] = useState([]);
    const [selectedClass, setSelectedClass] = useState(null);
    const mapRef = useRef(null);
    const geoJsonLayerRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current) {
            const mapInstance = L.map('map').setView([27.667948711867083, -97.695896537231363], 13);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(mapInstance);
            mapRef.current = mapInstance;
        }

        axios.get('ccgrid.json')
            .then(response => {
                const geoJsonLayer = L.geoJSON(response.data, {
                    style: () => ({
                        color: '#3388ff',
                        weight: 2,
                        opacity: 0.7,
                        fillOpacity: 0.2
                    }),
                    onEachFeature: (feature, layer) => {
                        layer.bindPopup(`FID: ${feature.properties.FID}`);
                    }
                }).addTo(mapRef.current);

                geoJsonLayerRef.current = geoJsonLayer;
            })
            .catch(error => {
                console.error('Error loading GeoJSON data:', error);
            });
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await axios.get('ccgrid.json');
                const features = response.data.features;
                const properties = features[0].properties;
                const keys = Object.keys(properties);

                setFeatures(features);
                setKeys(keys);
                setSelectedDate(features[0].properties.FID);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        };

        fetchData();
    }, []);

    useEffect(() => {
        if (selectedDate !== null) {
            const selectedFeature = features.find(feature => feature.properties.FID === selectedDate);
            if (selectedFeature) {
                const histogramData = keys
                    .filter(key => key !== 'FID')
                    .map(key => ({
                        label: key,
                        value: selectedFeature.properties[key]
                    }));

                setSelectedFeatureData(histogramData);
                drawHistogram(histogramData);
            }
        }
    }, [selectedDate, features, keys]);

    useEffect(() => {
        if (selectedClass !== null && selectedDate !== null) {
            highlightFeature(selectedClass);
        }
    }, [selectedClass, selectedDate]);

    const handleDateChange = (event) => {
        setSelectedDate(parseInt(event.target.value));
    };

    const handleClassSelection = (selectedClass) => {
        setSelectedClass(selectedClass);
    };

    const drawHistogram = (data) => {
        d3.select('.histogram').selectAll('*').remove();

        const svgWidth = 600;
        const svgHeight = 400;

        const svg = d3.select('.histogram').append('svg')
            .attr('width', svgWidth)
            .attr('height', svgHeight);

        const margin = { top: 20, right: 20, bottom: 40, left: 40 };
        const width = svgWidth - margin.left - margin.right;
        const height = svgHeight - margin.top - margin.bottom;

        const x = d3.scaleBand()
            .domain(data.map(d => d.label))
            .range([margin.left, width + margin.left])
            .padding(0.1);

        const y = d3.scaleLinear()
            .domain([0, d3.max(data, d => d.value)])
            .nice()
            .range([height, margin.top]);

        const g = svg.append('g')
            .attr('transform', `translate(${margin.left},${margin.top})`);

        g.append('g')
            .attr('class', 'axis axis-x')
            .attr('transform', `translate(0, ${height})`)
            .call(d3.axisBottom(x))
            .selectAll("text")
            .style("text-anchor", "end")
            .attr("dx", "-0.5em")
            .attr("dy", "0.15em")
            .attr("transform", "rotate(-25)");

        g.append('g')
            .attr('class', 'axis axis-y')
            .call(d3.axisLeft(y).ticks(5));

        const bars = g.selectAll('.bar')
            .data(data)
            .enter().append('rect')
            .attr('class', 'bar')
            .attr('x', d => x(d.label))
            .attr('y', d => y(d.value))
            .attr('width', x.bandwidth())
            .attr('height', d => height - y(d.value))
            .style('fill', '#3388ff')
            .on('click', (event, d) => handleClassSelection(d.label));

        bars.on('mouseover', function () {
            d3.select(this).style('fill', 'orange');
        }).on('mouseout', function () {
            d3.select(this).style('fill', '#3388ff');
        });
    };

    const highlightFeature = (selectedClass) => {
        resetHighlight();
        if (geoJsonLayerRef.current) {
            geoJsonLayerRef.current.eachLayer(layer => {
                if (layer.feature && layer.feature.properties.FID === selectedDate) {
                    const featureValue = layer.feature.properties[selectedClass];
                    if (featureValue !== undefined && featureValue !== 0) {
                        layer.setStyle({ fillColor: 'red', color: 'red', weight: 2 });
                    }
                }
            });
        }
    };

    const resetHighlight = () => {
        if (geoJsonLayerRef.current) {
            geoJsonLayerRef.current.eachLayer(layer => {
                if (layer.feature) {
                    layer.setStyle({ fillColor: '#3388ff', color: '#3388ff', weight: 2 });
                }
            });
        }
    };

    return (
        <div className="App">
            <div className="top-container">
                <div id="map" className="map"></div>
                <div className="histogram"></div>
            </div>
            <div className="controls">
                <label htmlFor="date">Select Date:</label>
                <select id="date" onChange={handleDateChange} value={selectedDate || ''}>
                    {features.map(feature => (
                        <option key={feature.properties.FID} value={feature.properties.FID}>
                            {feature.properties.FID}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default App;

export default App;



