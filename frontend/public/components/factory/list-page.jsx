import * as React from 'react';
import { connect } from 'react-redux';
import { Link } from 'react-router-dom';
import * as classNames from'classnames';
import * as PropTypes from 'prop-types';

import k8sActions from '../../module/k8s/k8s-actions';
import { CheckBoxes } from '../row-filter';
import { Dropdown, Firehose, kindObj, MultiFirehose, NavTitle, history, inject} from '../utils';
import { makeReduxID, makeQuery } from '../utils/k8s-watcher';


export const CompactExpandButtons = ({expand = false, onExpandChange = _.noop}) => <div className="btn-group btn-group-sm pull-left" data-toggle="buttons">
  <label className={classNames('btn compaction-btn', expand ? 'btn-unselected' : 'btn-selected')}>
    <input type="radio" onClick={() => onExpandChange(false)} /> Compact
  </label>
  <label className={classNames('btn compaction-btn', expand ? 'btn-selected' : 'btn-unselected')}>
    <input type="radio" onClick={() => onExpandChange(true)} /> Expand
  </label>
</div>;

/** @type {React.StatelessComponent<{label: string, onChange: React.ChangeEventHandler<any>, defaultValue: string}}>} */
export const TextFilter = ({label, onChange, defaultValue, style, className, autoFocus=true}) => <input
  type="text"
  style={style}
  className={classNames('form-control text-filter pull-right', className)}
  tabIndex={0}
  placeholder={`Filter ${label}...`}
  onChange={onChange}
  autoFocus={autoFocus}
  defaultValue={defaultValue}
/>;

TextFilter.displayName = 'TextFilter';

/** @augments {React.PureComponent<{ListComponent: React.ComponentType<any>, kinds: string[], data?: any[], rowFilters?: any[]}>} */
export class ListPageWrapper_ extends React.PureComponent {
  render () {
    const {data, kinds, ListComponent, rowFilters, reduxIDs} = this.props;
    const resources = _.pick(this.props, kinds);

    const RowsOfRowFilters = rowFilters && _.map(rowFilters, ({items, reducer, selected, type, numbers}, i) => {
      const count = _.isFunction(numbers) ? numbers(data) : undefined;
      return <CheckBoxes
        key={i}
        applyFilter={this.props.applyFilter}
        items={_.isFunction(items) ? items(resources) : items}
        numbers={count || _.countBy(data, reducer)}
        selected={selected}
        type={type}
        reduxIDs={reduxIDs}
      />;
    });

    return <div>
      <div className="row">
        {RowsOfRowFilters}
      </div>
      <div className="row">
        <div className="col-xs-12">
          <ListComponent {...this.props} />
        </div>
      </div>
    </div>;
  }
}

ListPageWrapper_.displayName = 'ListPageWrapper_';
ListPageWrapper_.propTypes = {
  data: PropTypes.array,
  kinds: PropTypes.arrayOf(PropTypes.string).isRequired,
  ListComponent: PropTypes.func.isRequired,
  rowFilters: PropTypes.array,
  staticFilters: PropTypes.array,
};

export const FireMan_ = connect(null, {filterList: k8sActions.filterList})(
  class ConnectedFireMan extends React.PureComponent {
    constructor (props) {
      super(props);
      this.onExpandChange = this.onExpandChange.bind(this);
      this.applyFilter = this.applyFilter.bind(this);

      const reduxIDs = props.resources.map(r => makeReduxID(kindObj(r.kind), makeQuery(r.namespace, r.selector, r.fieldSelector, r.name)));
      this.state = { reduxIDs };
    }

    componentWillReceiveProps({resources}) {
      const reduxIDs = resources.map(r => makeReduxID(kindObj(r.kind), makeQuery(r.namespace, r.selector, r.fieldSelector, r.name)));
      if (_.isEqual(reduxIDs, this.state.reduxIDs)) {
        return;
      }

      // reapply filters to the new list...
      // TODO (kans): we probably just need to be able to create new lists with filters already applied
      this.setState({ reduxIDs }, () => this.componentWillMount());
    }

    onExpandChange (expand) {
      this.setState({expand});
    }

    updateURL (filterName, options) {
      if (filterName !== this.props.textFilter) {
        // TODO (ggreer): support complex filters (objects, not just strings)
        return;
      }
      const params = new URLSearchParams(window.location.search);
      if (options) {
        params.set(filterName, options);
      } else {
        params.delete(filterName);
      }
      const url = new URL(window.location);
      history.replace(`${url.pathname}?${params.toString()}${url.hash}`);
    }

    applyFilter (filterName, options) {
      if (['q', 'kind', 'orderBy', 'sortBy'].includes(filterName)) {
        return;
      }
      this.state.reduxIDs.forEach(id => this.props.filterList(id, filterName, options));
      this.updateURL(filterName, options);
    }

    componentWillMount () {
      const params = new URLSearchParams(window.location.search);
      this.defaultValue = params.get(this.props.textFilter);
      params.forEach((v, k) => this.applyFilter(k, v));
    }

    render () {
      const {createButtonText, dropdownFilters, textFilter, filterLabel, title, canExpand, canCreate, createProps, Intro, autoFocus, resources} = this.props;

      const DropdownFilters = dropdownFilters && dropdownFilters.map(({type, items, title}) => {
        return <Dropdown key={title} className="pull-right" items={items} title={title} onChange={v => this.applyFilter(type, v)} />;
      });

      let createLink;
      if (canCreate) {
        if (createProps.to) {
          createLink = <Link className="co-m-primary-action pull-left" {...createProps} tabIndex={-1}>
            <button className="btn btn-primary" id="yaml-create" tabIndex={-1}>{createButtonText}</button>
          </Link>;
        } else {
          createLink = <button className="btn btn-primary" id="yaml-create" tabIndex={-1} {...createProps}>{createButtonText}</button>;
        }
      }

      return <div>
        {title && <NavTitle title={title} />}
        <div className="co-m-pane">
          <div className="co-m-pane__heading">
            <div className="row">
              <div className="col-xs-12">
                {Intro}
                {createLink}
                {canExpand && <CompactExpandButtons expand={this.state.expand} onExpandChange={this.onExpandChange} />}
                <TextFilter label={filterLabel} onChange={e => this.applyFilter(textFilter, e.target.value)} defaultValue={this.defaultValue} tabIndex={1} autoFocus={autoFocus} />
                {DropdownFilters}
              </div>
            </div>
          </div>
          <div className="co-m-pane__body">
            {inject(this.props.children, {
              resources,
              expand: this.state.expand,
              selector: resources[0].selector,
              fieldSelector: resources[0].fieldSelector,
              namespace: resources[0].namespace,
              reduxIDs: this.state.reduxIDs,
            })}
          </div>
        </div>
      </div>;
    }
  }
);

FireMan_.displayName = 'FireMan';

FireMan_.defaultProps = {
  textFilter: 'name',
};

FireMan_.propTypes = {
  canCreate: PropTypes.bool,
  canExpand: PropTypes.bool,
  createProps: PropTypes.object,
  createButtonText: PropTypes.string,
  fieldSelector: PropTypes.string,
  selectorFilterLabel: PropTypes.string,
  filterLabel: PropTypes.string,
  Intro: PropTypes.element,
  textFilter: PropTypes.string,
  title: PropTypes.string,
  resources: PropTypes.arrayOf(
    PropTypes.shape({
      kind: PropTypes.string.isRequired,
      selector: PropTypes.shape({
        matchLabels: PropTypes.objectOf(PropTypes.string),
        matchExpressions: PropTypes.arrayOf(PropTypes.object),
      }),
      fieldSelector: PropTypes.string,
      namespace: PropTypes.string,
      name: PropTypes.string,
      isList: PropTypes.bool,
      namespaced: PropTypes.bool,
    })
  ).isRequired,
};

/** @type {React.StatelessComponent<{ListComponent: React.ComponentType<any>, kind: string, namespace?: string, filterLabel: string, title?: string, showTitle?: boolean, dropdownFilters?: any[], fieldSelector?: string}>} */
export const ListPage = props => {
  const {createButtonText, createHandler, filterLabel, kind, namespace, selector, name, fieldSelector, showTitle = true} = props;
  const {labelPlural, plural, namespaced, label} = kindObj(kind);
  const title = props.title || labelPlural;

  const href = `/ns/${namespace || 'default'}/${plural}/new`;
  const createProps = createHandler ? {onClick: createHandler} : {to: href};

  const resources = [{
    isList: true,
    kind,
    name,
    namespace: namespaced ? namespace : undefined,
    prop: name || kind,
    namespaced,
    selector,
    fieldSelector,
  }];

  // TODO (kans): Unify Firehose/MultiFirehose - they should only consume the same resource object including kind, namespace, name, etc
  return <FireMan_
    filterLabel={filterLabel || `${labelPlural} by name`}
    selectorFilterLabel="Filter by selector (app=nginx) ..."
    createProps={createProps}
    title={showTitle ? title : undefined}
    canCreate={props.canCreate}
    canExpand={props.canExpand}
    createButtonText={createButtonText || `Create ${label}`}
    textFilter={props.textFilter}
    resources={resources}
    autoFocus={props.autoFocus}
    dropdownFilters={props.dropdownFilters}
  >
    <Firehose isList={true} kind={props.kind}>
      <ListPageWrapper_ ListComponent={props.ListComponent} kinds={[kind]} rowFilters={props.rowFilters}/>
    </Firehose>
  </FireMan_>;
};

ListPage.displayName = 'ListPage';

// FIXME(alecmerdler): Fix this typing
/** @type {React.StatelessComponent<{canCreate?: boolean, createButtonText?: string, ns?: string, flatten?: Function, filterLabel?: string, rowFilters?: any[], resources: any[], ListComponent: React.ComponentType<any>}>} */
export const MultiListPage = props => {
  const {createButtonText, resources, flatten, filterLabel, createProps, showTitle = true, title, namespace} = props;

  return <FireMan_
    filterLabel={filterLabel}
    selectorFilterLabel="Filter by selector (app=nginx) ..."
    createProps={createProps}
    title={showTitle ? title : undefined}
    canCreate={props.canCreate}
    canExpand={props.canExpand}
    createButtonText={createButtonText || 'Create'}
    textFilter={props.textFilter}
    resources={_.map(resources, (r) => ({
      ...r,
      isList: true,
      prop: r.prop || r.kind,
      namespace: r.namespaced ? namespace : r.namespace,
    }))}
    autoFocus={props.autoFocus}
    dropdownFilters={props.dropdownFilters}
  >
    <MultiFirehose flatten={flatten}>
      <ListPageWrapper_ ListComponent={props.ListComponent} kinds={_.map(resources, 'kind')} rowFilters={props.rowFilters} staticFilters={props.staticFilters} />
    </MultiFirehose>
  </FireMan_>;
};

MultiListPage.displayName = 'MultiListPage';
