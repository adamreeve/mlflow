import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { getExperiment, getParams, getRunInfo, getRunTags } from '../reducers/Reducers';
import { connect } from 'react-redux';
import { injectIntl, FormattedMessage } from 'react-intl';
import './CompareRunView.css';
import { Experiment, RunInfo } from '../sdk/MlflowMessages';
import { CompareRunScatter } from './CompareRunScatter';
import CompareRunContour from './CompareRunContour';
import Routes from '../routes';
import { Link } from 'react-router-dom';
import { getMetricHistoryApi } from '../actions';
import { getLatestMetrics, getMinMetrics, getMaxMetrics } from '../reducers/MetricReducer';
import CompareRunUtil from './CompareRunUtil';
import Utils from '../../common/utils/Utils';
import { Select, Switch, Tabs, Tooltip } from 'antd';
import ParallelCoordinatesPlotPanel from './ParallelCoordinatesPlotPanel';
import { PageHeader } from '../../shared/building_blocks/PageHeader';
import { CollapsibleSection } from '../../common/components/CollapsibleSection';
import { METRIC_SUMMARY_TYPES } from '../constants';

const { Option } = Select;
const { TabPane } = Tabs;

export class CompareRunView extends Component {
  static propTypes = {
    experiment: PropTypes.instanceOf(Experiment).isRequired,
    experimentId: PropTypes.string.isRequired,
    runInfos: PropTypes.arrayOf(PropTypes.instanceOf(RunInfo)).isRequired,
    runUuids: PropTypes.arrayOf(PropTypes.string).isRequired,
    metricLists: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.object)).isRequired,
    paramLists: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.object)).isRequired,
    // Array of user-specified run names. Elements may be falsy (e.g. empty string or undefined) if
    // a run was never given a name.
    runNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    // Array of names to use when displaying runs. No element in this array should be falsy;
    // we expect this array to contain user-specified run names, or default display names
    // ("Run <uuid>") for runs without names.
    runDisplayNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    getMetricHistoryApi: PropTypes.func.isRequired,
    intl: PropTypes.shape({ formatMessage: PropTypes.func.isRequired }).isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      tableWidth: null,
      onlyShowParamDiff: false,
      onlyShowMetricDiff: false,
      metricSummaryTypes: {},
    };
    this.onResizeHandler = this.onResizeHandler.bind(this);
    this.onTableBlockScrollHandler = this.onCompareRunTableScrollHandler.bind(this);
    this.onCompareRunTableScrollHandler = this.onCompareRunTableScrollHandler.bind(this);

    this.runDetailsTableRef = React.createRef();
    this.compareRunViewRef = React.createRef();
  }

  onResizeHandler(e) {
    const table = this.runDetailsTableRef.current;
    if (table !== null) {
      const containerWidth = table.clientWidth;
      this.setState({ tableWidth: containerWidth });
    }
  }

  onCompareRunTableScrollHandler(e) {
    const blocks = this.compareRunViewRef.current.querySelectorAll('.compare-run-table');
    blocks.forEach((_, index) => {
      const block = blocks[index];
      if (block !== e.target) {
        block.scrollLeft = e.target.scrollLeft;
      }
    });
  }

  componentDidMount() {
    const pageTitle = this.props.intl.formatMessage(
      {
        description: 'Page title for the compare runs page',
        defaultMessage: 'Comparing {runs} MLflow Runs',
      },
      {
        runs: this.props.runInfos.length,
      },
    );
    Utils.updatePageTitle(pageTitle);

    window.addEventListener('resize', this.onResizeHandler, true);
    window.dispatchEvent(new Event('resize'));
  }

  componentWillUnmount() {
    // Avoid registering `onResizeHandler` every time this component mounts
    window.removeEventListener('resize', this.onResizeHandler, true);
  }

  getTableColumnWidth() {
    const minColWidth = 200;
    let colWidth = minColWidth;

    if (this.state.tableWidth !== null) {
      colWidth = Math.round(this.state.tableWidth / (this.props.runInfos.length + 1));
      if (colWidth < minColWidth) {
        colWidth = minColWidth;
      }
    }
    return colWidth;
  }

  render() {
    const { experiment } = this.props;
    const experimentId = experiment.getExperimentId();
    const { runInfos, runNames } = this.props;

    const colWidth = this.getTableColumnWidth();
    const colWidthStyle = {
      width: `${colWidth}px`,
      minWidth: `${colWidth}px`,
      maxWidth: `${colWidth}px`,
    };

    const title = (
      <FormattedMessage
        defaultMessage='Comparing {runs} Runs'
        description='Breadcrumb title for compare runs page'
        values={{
          runs: this.props.runInfos.length,
        }}
      />
    );
    /* eslint-disable-next-line prefer-const */
    let breadcrumbs = [
      <Link to={Routes.getExperimentPageRoute(experimentId)}>{experiment.getName()}</Link>,
      title,
    ];

    return (
      <div className='CompareRunView' ref={this.compareRunViewRef}>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        <CollapsibleSection
          title={
            <h1 style={{ marginTop: 0, marginBottom: 0 }}>
              <FormattedMessage
                defaultMessage='Visualizations'
                description='Tabs title for plots on the compare runs page'
              />
            </h1>
          }
        >
          <Tabs>
            <TabPane
              tab={
                <FormattedMessage
                  defaultMessage='Parallel Coordinates Plot'
                  // eslint-disable-next-line max-len
                  description='Tab pane title for parallel coordinate plots on the compare runs page'
                />
              }
              key='1'
            >
              <ParallelCoordinatesPlotPanel runUuids={this.props.runUuids} />
            </TabPane>
            <TabPane
              tab={
                <FormattedMessage
                  defaultMessage='Scatter Plot'
                  description='Tab pane title for scatterplots on the compare runs page'
                />
              }
              key='2'
            >
              <CompareRunScatter
                runUuids={this.props.runUuids}
                runDisplayNames={this.props.runDisplayNames}
              />
            </TabPane>
            <TabPane
              tab={
                <FormattedMessage
                  defaultMessage='Contour Plot'
                  description='Tab pane title for contour plots on the compare runs page'
                />
              }
              key='3'
            >
              <CompareRunContour
                runUuids={this.props.runUuids}
                runDisplayNames={this.props.runDisplayNames}
              />
            </TabPane>
          </Tabs>
        </CollapsibleSection>
        <CollapsibleSection
          title={
            <h1 style={{ marginTop: 0, marginBottom: 0 }}>
              <FormattedMessage
                defaultMessage='Run details'
                // eslint-disable-next-line max-len
                description='Compare table title on the compare runs page'
              />
            </h1>
          }
        >
          <table
            className='table compare-table compare-run-table'
            ref={this.runDetailsTableRef}
            onScroll={this.onCompareRunTableScrollHandler}
          >
            <thead>
              <tr>
                <th scope='row' className='head-value sticky-header' style={colWidthStyle}>
                  <FormattedMessage
                    defaultMessage='Run ID:'
                    description='Row title for the run id on the experiment compare runs page'
                  />
                </th>
                {this.props.runInfos.map((r) => (
                  <th scope='row' className='data-value' key={r.run_uuid} style={colWidthStyle}>
                    <Tooltip
                      title={r.getRunUuid()}
                      color='gray'
                      placement='topLeft'
                      overlayStyle={{ maxWidth: '400px' }}
                      mouseEnterDelay={1.0}
                    >
                      <Link to={Routes.getRunPageRoute(r.getExperimentId(), r.getRunUuid())}>
                        {r.getRunUuid()}
                      </Link>
                    </Tooltip>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope='row' className='head-value sticky-header' style={colWidthStyle}>
                  <FormattedMessage
                    defaultMessage='Run Name:'
                    description='Row title for the run name on the experiment compare runs page'
                  />
                </th>
                {runNames.map((runName, i) => {
                  return (
                    <td className='data-value' key={runInfos[i].run_uuid} style={colWidthStyle}>
                      <div className='truncate-text single-line'>
                        <Tooltip
                          title={runName}
                          color='gray'
                          placement='topLeft'
                          overlayStyle={{ maxWidth: '400px' }}
                          mouseEnterDelay={1.0}
                        >
                          {runName}
                        </Tooltip>
                      </div>
                    </td>
                  );
                })}
              </tr>
              <tr>
                <th scope='row' className='head-value sticky-header' style={colWidthStyle}>
                  <FormattedMessage
                    defaultMessage='Start Time:'
                    // eslint-disable-next-line max-len
                    description='Row title for the start time of runs on the experiment compare runs page'
                  />
                </th>
                {this.props.runInfos.map((run) => {
                  const startTime = run.getStartTime()
                    ? Utils.formatTimestamp(run.getStartTime())
                    : '(unknown)';
                  return (
                    <td className='data-value' key={run.run_uuid} style={colWidthStyle}>
                      <Tooltip
                        title={startTime}
                        color='gray'
                        placement='topLeft'
                        overlayStyle={{ maxWidth: '400px' }}
                        mouseEnterDelay={1.0}
                      >
                        {startTime}
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </CollapsibleSection>
        <CollapsibleSection
          title={
            <h1 style={{ marginTop: 0, marginBottom: 0 }}>
              <FormattedMessage
                defaultMessage='Parameters'
                // eslint-disable-next-line max-len
                description='Row group title for parameters of runs on the experiment compare runs page'
              />
            </h1>
          }
        >
          <Switch
            checkedChildren='Show diff only'
            unCheckedChildren='Show diff only'
            onChange={(checked, e) => this.setState({ onlyShowParamDiff: checked })}
          />
          <br />
          <br />
          <table
            className='table compare-table compare-run-table'
            style={{ maxHeight: '500px' }}
            onScroll={this.onCompareRunTableScrollHandler}
          >
            <tbody>
              {this.renderDataRows(
                this.props.paramLists,
                colWidth,
                this.state.onlyShowParamDiff,
                true,
              )}
            </tbody>
          </table>
        </CollapsibleSection>
        <CollapsibleSection
          title={
            <h1 style={{ marginTop: 0, marginBottom: 0 }}>
              <FormattedMessage
                defaultMessage='Metrics'
                // eslint-disable-next-line max-len
                description='Row group title for metrics of runs on the experiment compare runs page'
              />
            </h1>
          }
        >
          <Switch
            checkedChildren='Show diff only'
            unCheckedChildren='Show diff only'
            onChange={(checked, e) => this.setState({ onlyShowMetricDiff: checked })}
          />
          <br />
          <br />
          <table
            className='table compare-table compare-run-table'
            style={{ maxHeight: '300px' }}
            onScroll={this.onCompareRunTableScrollHandler}
          >
            <tbody>
              {this.renderDataRows(
                this.selectMetricValues(this.props.metricLists),
                colWidth,
                this.state.onlyShowMetricDiff,
                false,
                (key, data) => {
                  return (
                    <Fragment key={key}>
                      <Link
                        to={Routes.getMetricPageRoute(
                          this.props.runInfos
                            .map((info) => info.run_uuid)
                            .filter((uuid, idx) => data[idx] !== undefined),
                          key,
                          experimentId,
                        )}
                        title='Plot chart'
                      >
                        {key}
                        <i className='fas fa-chart-line' style={{ paddingLeft: '6px' }} />
                      </Link>
                      <Tooltip
                        title={this.props.intl.formatMessage({
                          defaultMessage: 'Metric value to show',
                          description:
                            // eslint-disable-next-line max-len
                            'Tooltip for the metric value type select dropdown for the metric comparison table',
                        })}
                      >
                        <Select
                          className='metric-type'
                          value={this.metricSummaryTypeLabel(this.metricSummaryType(key))}
                          onChange={(value) => this.onMetricSummaryTypeSelected(key, value)}
                          virtual={false}
                        >
                          {Object.values(METRIC_SUMMARY_TYPES).map((summaryType) => {
                            const label = this.metricSummaryTypeLabel(summaryType);
                            return (
                              <Option key={summaryType} title={label} value={summaryType}>
                                {label}
                              </Option>
                            );
                          })}
                        </Select>
                      </Tooltip>
                    </Fragment>
                  );
                },
                Utils.formatMetric,
              )}
            </tbody>
          </table>
        </CollapsibleSection>
      </div>
    );
  }

  // eslint-disable-next-line no-unused-vars
  renderDataRows(
    list,
    colWidth,
    onlyShowDiff,
    highlightDiff = false,
    headerMap = (key, data) => key,
    formatter = (value) => value,
  ) {
    const keys = CompareRunUtil.getKeys(list);
    const data = {};
    keys.forEach((k) => (data[k] = []));
    list.forEach((records, i) => {
      keys.forEach((k) => data[k].push(undefined));
      records.forEach((r) => (data[r.key][i] = r.value));
    });

    const colWidthStyle = {
      width: `${colWidth}px`,
      minWidth: `${colWidth}px`,
      maxWidth: `${colWidth}px`,
    };

    function isAllEqual(k) {
      return data[k].every((x) => x === data[k][0]);
    }

    return keys.map((k) => {
      const allEqual = isAllEqual(k);

      let rowClass = undefined;
      if (highlightDiff && !allEqual) {
        rowClass = 'diff-row';
      }

      return onlyShowDiff && allEqual ? null : (
        <tr key={k} className={rowClass}>
          <th scope='row' className='head-value sticky-header' style={colWidthStyle}>
            {headerMap(k, data[k])}
          </th>
          {data[k].map((value, i) => {
            const cellText = value === undefined ? '' : formatter(value);
            return (
              <td
                className='data-value'
                key={this.props.runInfos[i].run_uuid}
                style={colWidthStyle}
              >
                <Tooltip
                  title={cellText}
                  color='gray'
                  placement='topLeft'
                  overlayStyle={{ maxWidth: '400px' }}
                  mouseEnterDelay={1.0}
                >
                  <span className='truncate-text single-line'>{cellText}</span>
                </Tooltip>
              </td>
            );
          })}
        </tr>
      );
    });
  }

  selectMetricValues(metricLists) {
    return metricLists.map((metricList) =>
      metricList.map((keyVal) => {
        const metricName = keyVal.key;
        const metricSummary = keyVal.value;
        let value;
        switch (this.metricSummaryType(metricName)) {
          case METRIC_SUMMARY_TYPES.MIN: {
            value = metricSummary.min;
            break;
          }
          case METRIC_SUMMARY_TYPES.MAX: {
            value = metricSummary.max;
            break;
          }
          case METRIC_SUMMARY_TYPES.LATEST:
          default: {
            value = metricSummary.latest;
            break;
          }
        }
        return {
          key: metricName,
          value: value,
        };
      }),
    );
  }

  metricSummaryType(metricName) {
    return this.state.metricSummaryTypes[metricName] || METRIC_SUMMARY_TYPES.LATEST;
  }

  metricSummaryTypeLabel(metricSummaryType) {
    switch (metricSummaryType) {
      case METRIC_SUMMARY_TYPES.MIN: {
        return this.props.intl.formatMessage({
          defaultMessage: 'Min',
          description:
            // eslint-disable-next-line max-len
            'Option label for showing metric minimum values in the metric comparison table',
        });
      }
      case METRIC_SUMMARY_TYPES.MAX: {
        return this.props.intl.formatMessage({
          defaultMessage: 'Max',
          description:
            // eslint-disable-next-line max-len
            'Option label for showing metric maximum values in the metric comparison table',
        });
      }
      case METRIC_SUMMARY_TYPES.LATEST:
      default: {
        return this.props.intl.formatMessage({
          defaultMessage: 'Latest',
          description:
            // eslint-disable-next-line max-len
            'Option label for showing latest metric values in the metric comparison table',
        });
      }
    }
  }

  onMetricSummaryTypeSelected(metricName, value) {
    if (value === METRIC_SUMMARY_TYPES.MIN || value === METRIC_SUMMARY_TYPES.MAX) {
      this.ensureMetricMinMaxAvailable(metricName);
    }
    this.setState((state, _) => {
      return {
        ...state,
        metricSummaryTypes: {
          ...state.metricSummaryTypes,
          [metricName]: value,
        },
      };
    });
  }

  ensureMetricMinMaxAvailable(metricName) {
    this.props.runUuids.forEach((runUuid, runIndex) => {
      const metricList = this.props.metricLists[runIndex];
      metricList.forEach((metric) => {
        // Assume if value is defined then max is also defined
        if (metric.key === metricName && metric.value.min === undefined) {
          this.props.getMetricHistoryApi(runUuid, metric.key);
        }
      });
    });
  }
}

const mapStateToProps = (state, ownProps) => {
  const runInfos = [];
  const metricLists = [];
  const paramLists = [];
  const runNames = [];
  const runDisplayNames = [];
  const { experimentId, runUuids } = ownProps;
  const experiment = getExperiment(experimentId, state);
  runUuids.forEach((runUuid) => {
    runInfos.push(getRunInfo(runUuid, state));
    const latestMetrics = getLatestMetrics(runUuid, state);
    const minMetrics = getMinMetrics(runUuid, state);
    const maxMetrics = getMaxMetrics(runUuid, state);
    const metricList = Object.values(latestMetrics).map((m) => {
      const minValue = minMetrics && minMetrics[m.key] && minMetrics[m.key].value;
      const maxValue = maxMetrics && maxMetrics[m.key] && maxMetrics[m.key].value;
      return {
        key: m.key,
        value: {
          latest: m.value,
          min: minValue,
          max: maxValue,
        },
      };
    });
    metricLists.push(metricList);
    paramLists.push(Object.values(getParams(runUuid, state)));
    const runTags = getRunTags(runUuid, state);
    runDisplayNames.push(Utils.getRunDisplayName(runTags, runUuid));
    runNames.push(Utils.getRunName(runTags));
  });
  return { experiment, runInfos, metricLists, paramLists, runNames, runDisplayNames };
};
const mapDispatchToProps = { getMetricHistoryApi };

export default connect(mapStateToProps, mapDispatchToProps)(injectIntl(CompareRunView));
