import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { FormattedMessage } from 'react-intl';
import qs from 'qs';
import Utils from '../../common/utils/Utils';
import { Button } from '../../shared/building_blocks/Button';
import Routes from '../routes';
import './MetricView.css';
import { Experiment } from '../sdk/MlflowMessages';
import { getExperiment, getRunTags } from '../reducers/Reducers';
import MetricsPlotPanel from './MetricsPlotPanel';
import { withRouter, Link } from 'react-router-dom';
import { PageHeader } from '../../shared/building_blocks/PageHeader';

export class MetricViewImpl extends Component {
  static propTypes = {
    experiment: PropTypes.instanceOf(Experiment).isRequired,
    runUuids: PropTypes.arrayOf(PropTypes.string).isRequired,
    runNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    metricKey: PropTypes.string.isRequired,
    plotKeys: PropTypes.arrayOf(PropTypes.number).isRequired,
    location: PropTypes.object.isRequired,
    history: PropTypes.object.isRequired,
  };

  getRunsLink() {
    const { experiment, runUuids, runNames } = this.props;
    const experimentId = experiment.getExperimentId();

    if (!runUuids || runUuids.length === 0) {
      return null;
    }

    return runUuids.length === 1 ? (
      <Link to={Routes.getRunPageRoute(experimentId, runUuids[0])}>{runNames[0]}</Link>
    ) : (
      <Link to={Routes.getCompareRunPageRoute(runUuids, experimentId)}>
        <FormattedMessage
          defaultMessage='Comparing {length} Runs'
          description='Breadcrumb title for metrics page when comparing multiple runs'
          values={{
            length: runUuids.length,
          }}
        />
      </Link>
    );
  }

  addPlot = () => {
    const { runUuids, metricKey, experiment, history, location, plotKeys } = this.props;
    const nextKey = Math.max(...plotKeys) + 1;
    const plotStates = [
      ...plotKeys.map((key) => Utils.getMetricPlotStateFromUrl(location.search, key)),
      { key: nextKey },
    ];
    history.replace(
      Routes.getMetricPageRoute(runUuids, metricKey, experiment.experiment_id, plotStates),
    );
  };

  removePlot = (plotKey) => {
    const { runUuids, metricKey, experiment, history, location, plotKeys } = this.props;
    const experimentId = experiment.experiment_id;
    const plotStates = plotKeys
      .filter((key) => key !== plotKey)
      .map((key) => Utils.getMetricPlotStateFromUrl(location.search, key));
    history.replace(Routes.getMetricPageRoute(runUuids, metricKey, experimentId, plotStates));
  };

  updateUrlState = (plotKey, newState) => {
    const { runUuids, metricKey, experiment, history, location, plotKeys } = this.props;
    const experimentId = experiment.experiment_id;
    const plotStates = plotKeys.map((key) => {
      if (key === plotKey) {
        return newState;
      }
      return Utils.getMetricPlotStateFromUrl(location.search, key);
    });
    history.replace(Routes.getMetricPageRoute(runUuids, metricKey, experimentId, plotStates));
  };

  render() {
    const { experiment, runUuids, metricKey, location, plotKeys } = this.props;
    const experimentId = experiment.experiment_id;
    let metricKeys = new Set();
    plotKeys.forEach((plotKey) => {
      const { selectedMetricKeys } = Utils.getMetricPlotStateFromUrl(location.search, plotKey);
      metricKeys = new Set([...metricKeys, ...selectedMetricKeys]);
    });
    const [firstMetric] = metricKeys;
    const title =
      metricKeys.size > 1 ? (
        <FormattedMessage defaultMessage='Metrics' description='Title for metrics page' />
      ) : (
        firstMetric
      );
    const breadcrumbs = [
      <Link to={Routes.getExperimentPageRoute(experimentId)}>{experiment.getName()}</Link>,
      this.getRunsLink(),
      title,
    ];
    return (
      <div>
        <PageHeader title={title} breadcrumbs={breadcrumbs} />
        {plotKeys.map((plotKey) => (
          <Fragment key={plotKey}>
            <MetricsPlotPanel
              {...{
                experimentId,
                runUuids,
                metricKey,
                plotKey,
                updateUrlState: this.updateUrlState,
              }}
            />
            {plotKeys.length > 1 ? (
              <div>
                <Button onClick={() => this.removePlot(plotKey)}>
                  <FormattedMessage
                    defaultMessage='Remove plot'
                    description='Button text to remove a plot from the metric view'
                  />
                </Button>
              </div>
            ) : null}
          </Fragment>
        ))}
        <div>
          <Button onClick={this.addPlot}>
            <FormattedMessage
              defaultMessage='Add plot'
              description='Button text to add a new plot to the metric view'
            />
          </Button>
        </div>
      </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => {
  const { experimentId, location, runUuids } = ownProps;
  const experiment = experimentId !== null ? getExperiment(experimentId, state) : null;
  const searchValues = qs.parse(location.search);
  const plotKeys = JSON.parse(searchValues['plot_keys']);
  const runNames = runUuids.map((runUuid) => {
    const tags = getRunTags(runUuid, state);
    return Utils.getRunDisplayName(tags, runUuid);
  });
  return { experiment, plotKeys, runNames };
};

export const MetricView = withRouter(connect(mapStateToProps)(MetricViewImpl));
