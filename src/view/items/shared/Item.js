import { createDocumentFragment } from '../../../utils/dom';
import noop from '../../../utils/noop';

export default class Item {
	constructor ( options ) {
		this.parentFragment = options.parentFragment;
		this.ractive = options.parentFragment.ractive;

		this.template = options.template;
		this.index = options.index;
		this.type = options.template.t;

		this.dirty = false;
	}

	bubble () {
		if ( !this.dirty ) {
			this.dirty = true;
			this.parentFragment.bubble();
		}
	}

	destroyed () {
		if ( this.fragment ) this.fragment.destroyed();
	}

	find () {
		return null;
	}

	findComponent () {
		return null;
	}

	findNextNode () {
		return this.parentFragment.findNextNode( this );
	}

	getContextObject () {
		return this.element ? this.element.getContextObject() : this.parentFragment.getContextObject();
	}

	shuffled () {
		if ( this.fragment ) this.fragment.shuffled();
	}

	valueOf () {
		return this.toString();
	}
}

Item.prototype.findAll = noop;
Item.prototype.findAllComponents = noop;

export class ContainerItem extends Item {
	constructor ( options ) {
		super( options );
	}

	detach () {
		return this.fragment ? this.fragment.detach() : createDocumentFragment();
	}

	find ( selector ) {
		if ( this.fragment ) {
			return this.fragment.find( selector );
		}
	}

	findAll ( selector, query ) {
		if ( this.fragment ) {
			this.fragment.findAll( selector, query );
		}
	}

	findComponent ( name ) {
		if ( this.fragment ) {
			return this.fragment.findComponent( name );
		}
	}

	findAllComponents ( name, query ) {
		if ( this.fragment ) {
			this.fragment.findAllComponents( name, query );
		}
	}

	firstNode ( skipParent ) {
		return this.fragment && this.fragment.firstNode( skipParent );
	}

	toString ( escape ) {
		return this.fragment ? this.fragment.toString( escape ) : '';
	}
}
