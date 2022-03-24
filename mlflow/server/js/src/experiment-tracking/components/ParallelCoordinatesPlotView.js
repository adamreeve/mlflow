import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { findLast, invert, isEqual, min, max, range, sortBy, uniq } from 'lodash';
import { LazyPlot } from './LazyPlot';
import { METRIC_SUMMARY_TYPES } from '../constants';

const AXIS_LABEL_CLS = '.pcp-plot .parcoords .y-axis .axis-heading .axis-title';
export const UNKNOWN_TERM = 'unknown';

export const AXIS_TYPE = {
  PARAM: 'PARAM',
  METRIC: 'METRIC',
};

export class Axis {
  constructor(label, name, type, metricType) {
    this.label = label;
    this.name = name;
    this.type = type;
    this.metricType = metricType;
  }

  key() {
    return this.type + '_' + this.name + (this.metricType || '');
  }
}

export class ParallelCoordinatesPlotView extends React.Component {
  static propTypes = {
    runUuids: PropTypes.arrayOf(PropTypes.string).isRequired,
    axes: PropTypes.arrayOf(PropTypes.instanceOf(Axis)).isRequired,
    dimensions: PropTypes.arrayOf(PropTypes.object).isRequired,
  };

  state = {
    // Current sequence of all axes, both parameters and metrics.
    sequence: [...this.props.axes],
  };

  static getDerivedStateFromProps(props, state) {
    const axesFromProps = props.axes;
    const axesFromState = state.sequence;
    const sort_keys = ['name', 'type', 'metricType'];
    if (!isEqual(sortBy(axesFromProps, sort_keys), sortBy(axesFromState, sort_keys))) {
      return { sequence: axesFromProps };
    }
    return null;
  }

  getData() {
    const { sequence } = this.state;
    const { axes, dimensions } = this.props;
    const lastMetricAxis = this.findLastAxisFromState(
      axes.filter((ax) => ax.type === AXIS_TYPE.METRIC),
    );
    const lastMetricDimension = dimensions.find(
      (d) =>
        d.type === AXIS_TYPE.METRIC &&
        d.label === lastMetricAxis.name &&
        d.metricType === lastMetricAxis.metricType,
    );
    const colorScaleConfigs = ParallelCoordinatesPlotView.getColorScaleConfigsForDimension(
      lastMetricDimension,
    );
    const ids = axes.map((ax) => ax.key());
    // This make sure axis order consistency across renders.
    const orderedDimensions = ParallelCoordinatesPlotView.getDimensionsOrderedBySequence(
      dimensions,
      sequence,
    );
    return [
      {
        type: 'parcoords',
        line: { ...colorScaleConfigs },
        dimensions: orderedDimensions,
        ids,
      },
    ];
  }

  static getDimensionsOrderedBySequence(dimensions, sequence) {
    const sequenceLabels = sequence.map((ax) => ax.label);
    return sortBy(dimensions, [(dimension) => sequenceLabels.indexOf(dimension.label)]);
  }

  static getLabelElementsFromDom = () => Array.from(document.querySelectorAll(AXIS_LABEL_CLS));

  findLastAxisFromState(axes) {
    const { sequence } = this.state;
    const keySet = new Set(axes.map((ax) => ax.key()));
    return findLast(sequence, (ax) => keySet.has(ax.key()));
  }

  static getColorScaleConfigsForDimension(dimension) {
    if (!dimension) return null;
    const cmin = min(dimension.values);
    const cmax = max(dimension.values);
    return {
      showscale: true,
      colorscale: 'Jet',
      cmin,
      cmax,
      color: dimension.values,
    };
  }

  // Update styles(green & bold) for metric axes.
  // Note(Zangr) 2019-6-25 this is needed because there is no per axis label setting available. This
  // needs to be called every time chart updates. More information about currently available label
  // setting here: https://plot.ly/javascript/reference/#parcoords-labelfont
  updateMetricAxisLabelStyle = () => {
    /* eslint-disable no-param-reassign */
    const metricsLabelsSet = new Set(this.metricAxes().map((ax) => ax.label));
    // TODO(Zangr) 2019-06-20 This assumes name uniqueness across params & metrics. Find a way to
    // make it more deterministic. Ex. Add add different data attributes to indicate axis kind.
    // TODO: innerHtml won't match metric labels
    ParallelCoordinatesPlotView.getLabelElementsFromDom()
      .filter((el) => metricsLabelsSet.has(el.innerHTML))
      .forEach((el) => {
        el.style.fill = 'green';
        el.style.fontWeight = 'bold';
      });
  };

  maybeUpdateStateForColorScale = (currentSequenceFromPlotly) => {
    const rightmostMetricFromState = this.findLastAxisFromState(this.metricAxes());
    const metricLabelsSet = new Set(this.metricAxes().map((ax) => ax.label));
    const rightmostMetricFromPlotly = findLast(currentSequenceFromPlotly, (key) =>
      metricLabelsSet.has(key),
    );
    // Currently we always render color scale based on the rightmost metric axis, so if that changes
    // we need to setState with the new axes sequence to trigger a rerender.
    if (rightmostMetricFromState.label !== rightmostMetricFromPlotly) {
      this.setState({
        sequence: sortBy(this.props.axes, [(ax) => currentSequenceFromPlotly.indexOf(ax.label)]),
      });
    }
  };

  handlePlotUpdate = ({ data: [{ ids, dimensions }] }) => {
    // eslint-disable-next-line no-console
    this.updateMetricAxisLabelStyle();
    this.maybeUpdateStateForColorScale(dimensions.map((d) => d.label));
  };

  metricAxes = () => this.props.axes.filter((ax) => ax.type === AXIS_TYPE.METRIC);

  render() {
    return (
      <LazyPlot
        layout={{ autosize: true, margin: { t: 50 } }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
        data={this.getData()}
        onUpdate={this.handlePlotUpdate}
        className='pcp-plot'
        config={{ displayModeBar: false }}
      />
    );
  }
}

export const generateAttributesForCategoricalDimension = (labels) => {
  // Create a lookup from label to its own alphabetical sorted order.
  // Ex. ['A', 'B', 'C'] => { 'A': '0', 'B': '1', 'C': '2' }
  const sortedUniqLabels = uniq(labels).sort();

  // We always want the UNKNOWN_TERM to be at the top
  // of the chart which is end of the sorted label array
  // Ex. ['A', 'UNKNOWN_TERM', 'B'] => { 'A': '0', 'B': '1', 'UNKNOWN_TERM': '2' }
  let addUnknownTerm = false;
  const filteredSortedUniqLabels = sortedUniqLabels.filter((label) => {
    if (label === UNKNOWN_TERM) addUnknownTerm = true;
    return label !== UNKNOWN_TERM;
  });
  if (addUnknownTerm) {
    filteredSortedUniqLabels.push(UNKNOWN_TERM);
  }
  const labelToIndexStr = invert(filteredSortedUniqLabels);
  const attributes = {};

  // Values are assigned to their alphabetical sorted index number
  attributes.values = labels.map((label) => Number(labelToIndexStr[label]));

  // Default to alphabetical order for categorical axis here. Ex. [0, 1, 2, 3 ...]
  attributes.tickvals = range(filteredSortedUniqLabels.length);

  // Default to alphabetical order for categorical axis here. Ex. ['A', 'B', 'C', 'D' ...]
  attributes.ticktext = filteredSortedUniqLabels.map((sortedUniqLabel) =>
    sortedUniqLabel.substring(0, 10),
  );

  return attributes;
};

/**
 * Infer the type of data in a run. If all the values are numbers or castable to numbers, then
 * treat it as a number column.
 */
export const inferType = (key, runUuids, entryByRunUuid) => {
  for (let i = 0; i < runUuids.length; i++) {
    const runUuid = runUuids[i];
    if (entryByRunUuid[runUuid] && entryByRunUuid[runUuid][key]) {
      const { value } = entryByRunUuid[runUuid][key];
      if (typeof value === 'string' && isNaN(Number(value)) && value !== 'NaN') {
        return 'string';
      }
    }
  }
  return 'number';
};

export const createDimension = (key, runUuids, entryByRunUuid, label) => {
  let attributes = {};
  const dataType = inferType(key, runUuids, entryByRunUuid);
  if (dataType === 'string') {
    attributes = generateAttributesForCategoricalDimension(
      runUuids.map((runUuid) =>
        entryByRunUuid[runUuid] && entryByRunUuid[runUuid][key]
          ? entryByRunUuid[runUuid][key].value
          : UNKNOWN_TERM,
      ),
    );
  } else {
    let maxValue = Number.MIN_SAFE_INTEGER;
    const values = runUuids.map((runUuid) => {
      if (entryByRunUuid[runUuid] && entryByRunUuid[runUuid][key]) {
        const { value } = entryByRunUuid[runUuid][key];
        const numericValue = Number(value);
        if (maxValue < numericValue) maxValue = numericValue;
        return numericValue;
      }
      return UNKNOWN_TERM;
    });

    // For Numerical values, we take the max value of all the attribute
    // values and 0.01 to it so it is always at top of the graph.
    attributes.values = values.map((value) => {
      if (value === UNKNOWN_TERM) return maxValue + 0.01;
      return value;
    });

    // For some reason, Plotly tries to plot these values with SI prefixes by default
    // Explicitly set to 5 fixed digits float here
    attributes.tickformat = '.5f';
  }
  return {
    label: label || key,
    ...attributes,
  };
};

function selectMetrics(latestMetrics, minMetrics, maxMetrics, metricType) {
  switch (metricType) {
    case METRIC_SUMMARY_TYPES.MIN: {
      return minMetrics;
    }
    case METRIC_SUMMARY_TYPES.MAX: {
      return maxMetrics;
    }
    case METRIC_SUMMARY_TYPES.LATEST:
    default: {
      return latestMetrics;
    }
  }
}

const mapStateToProps = (state, ownProps) => {
  const { runUuids, axes } = ownProps;
  const {
    latestMetricsByRunUuid,
    minMetricsByRunUuid,
    maxMetricsByRunUuid,
    paramsByRunUuid,
  } = state.entities;
  const paramDimensions = axes
    .filter((ax) => ax.type === AXIS_TYPE.PARAM)
    .map((ax) => createDimension(ax.name, runUuids, paramsByRunUuid, ax.label));
  const metricDimensions = axes
    .filter((ax) => ax.type === AXIS_TYPE.METRIC)
    .map((ax) =>
      createDimension(
        ax.name,
        runUuids,
        selectMetrics(
          latestMetricsByRunUuid,
          minMetricsByRunUuid,
          maxMetricsByRunUuid,
          ax.metricType,
        ),
        ax.label,
      ),
    );
  const dimensions = [...paramDimensions, ...metricDimensions];
  return { dimensions: dimensions };
};

export default connect(mapStateToProps)(ParallelCoordinatesPlotView);
