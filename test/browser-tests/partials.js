import { test } from 'qunit';
import { hasUsableConsole, onWarn } from 'test-config';

const partialsFn = {
	foo () {
		return this.get( 'foo' ) ? '<p>yes</p>' : '<h1>no</h1>';
	}
};

test( 'specify partial by function', t => {
	new Ractive({
		el: fixture,
		template: '{{>foo}}',
		data: { foo: true },
		partials: partialsFn
	});

	t.htmlEqual( fixture.innerHTML, '<p>yes</p>' );
});

if ( hasUsableConsole ) {
	test( 'no return of partial warns in debug', t => {
		t.expect( 2 );

		onWarn( msg => {
			t.ok( msg );
		});

		// will throw on no-partial found
		new Ractive({
			el: fixture,
			template: '{{>foo}}',
			data: { foo: true },
			debug: true,
			partials: {
				foo () {
					// where's my partial?
				}
			}
		});
	});

	test( 'Warn on unknown partial', t => {
		t.expect( 2 );

		onWarn( () => t.ok( true ) );

		new Ractive({
			el: fixture,
			template: '{{>unknown}}{{>other {a:42} }}',
			partials: {}
		});
	});

	test( 'Don\'t warn on empty partial', t => {
		t.expect( 1 );

		onWarn( () => {
			t.ok( false );
		});

		new Ractive({
			el: fixture,
			template: '{{>empty}}',
			partials: {
				empty: ''
			}
		});

		t.ok( true );
	});
}

test( '`this` in function refers to ractive instance', t => {
	let thisForFoo;
	let thisForBar;

	const ractive = new Ractive({
		el: fixture,
		template: '{{>foo}}<widget/>',
		data: { foo: true },
		components: {
			widget: Ractive.extend({
				template: '{{>bar}}'
			})
		},
		partials: {
			foo () {
				thisForFoo = this;
				return 'foo';
			},
			bar () {
				thisForBar = this;
				return 'bar';
			}
		}
	});

	t.equal( thisForFoo, ractive );
	t.equal( thisForBar, ractive );
});

test( 'partial function has access to parser helper', t => {
	t.expect( 1 );

	new Ractive({
		el: fixture,
		template: '{{>foo}}',
		partials: {
			foo ( parser ) {
				t.ok( parser.fromId );
			}
		}
	});
});

test( 'partial can be preparsed template (#942)', t => {
	const partial = Ractive.parse( '<p>hello partial</p>' );

	new Ractive({
		el: fixture,
		template: '{{>foo}}',
		partials: { foo: partial }
	});

	t.htmlEqual( fixture.innerHTML, '<p>hello partial</p>' );
});

test( 'partial functions belong to instance, not Component', t => {
	const Component = Ractive.extend({
		template: '{{>foo}}',
		partials: partialsFn
	});

	const ractive1 = new Component({
		data: { foo: true }
	});

	const ractive2 = new Component({
		data: { foo: false }
	});

	t.equal( ractive1.toHTML(), '<p>yes</p>' );
	t.equal( ractive2.toHTML(), '<h1>no</h1>' );
});

test( 'partial functions selects same partial until reset', t => {
	const ractive = new Ractive({
		el: fixture,
		template: '{{#items}}{{>foo}}{{/items}}',
		partials: {
			foo () {
				return this.get( 'foo' ) ? '<p>{{.}}</p>' : '<h1>{{.}}</h1>';
			}
		},
		data: {
			foo: true,
			items: [ 1 ]
		}
	});

	t.htmlEqual( fixture.innerHTML, '<p>1</p>' );

	ractive.set( 'foo', false );
	ractive.push( 'items', 2 );

	t.htmlEqual( fixture.innerHTML, '<p>1</p><p>2</p>' );
});

test( 'reset data re-evaluates partial function', t => {
	const ractive = new Ractive({
		el: fixture,
		template: '{{>foo}}',
		data: { foo: true },
		partials: partialsFn
	});

	t.htmlEqual( fixture.innerHTML, '<p>yes</p>' );
	ractive.reset( { foo: false } );
	t.htmlEqual( fixture.innerHTML, '<h1>no</h1>' );
});

test( 'partials functions can be found on view heirarchy', t => {
	const Widget = Ractive.extend({
		template: '{{>foo}}'
	});

	const ractive = new Ractive({
		el: fixture,
		template: '{{#if !foo}}<Widget/>{{/if}}',
		components: { Widget },
		data: { foo: true },
		partials: partialsFn
	});

	t.htmlEqual( fixture.innerHTML, '' );
	ractive.set( 'foo', false );
	t.htmlEqual( fixture.innerHTML, '<h1>no</h1>' );
});

test( 'static partials are compiled on Component not instance', t => {
	const Component = Ractive.extend({
		template: '{{>foo}}',
		partials: {
			foo: '<p>{{foo}}</p>'
		}
	});

	const ractive = new Component({
		el: fixture
	});

	t.ok( !ractive.partials.hasOwnProperty( 'foo' ) );
	t.deepEqual( Component.partials.foo, [{ t:7, e: 'p', f: [{ t:2, r: 'foo' }] }] );
});

test( 'Partials work in attributes (#917)', t => {
	const ractive = new Ractive({
		el: fixture,
		template: '<div style="{{>boxAttr}}"/>',
		partials: {
			boxAttr: 'height: {{height}}px;'
		},
		data: {
			height: 100
		}
	});

	ractive.set( 'height', 200 );

	t.htmlEqual( fixture.innerHTML, '<div style="height: 200px;"></div>' );
});

test( 'Partial name can be a reference', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `{{#each items}}{{>type}}{{/each}}`,
		data: {
			items: [{ type: 'foo' }, { type: 'bar' }, { type: 'foo' }, { type: 'baz' }]
		},
		partials: {
			foo: ':FOO',
			bar: ':BAR',
			baz: ':BAZ'
		}
	});

	t.htmlEqual( fixture.innerHTML, ':FOO:BAR:FOO:BAZ' );
	ractive.push( 'items', { type: 'foo' });
	t.htmlEqual( fixture.innerHTML, ':FOO:BAR:FOO:BAZ:FOO' );
	ractive.set( 'items[1].type', 'baz' );
	t.htmlEqual( fixture.innerHTML, ':FOO:BAZ:FOO:BAZ:FOO' );
});

test( 'Partial name can be an expression', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `{{>'partial_' + x}}`,
		data: { x: 'a' },
		partials: {
			partial_a: 'first',
			partial_b: 'second'
		}
	});

	t.htmlEqual( fixture.innerHTML, 'first' );
	ractive.set( 'x', 'b' );
	t.htmlEqual( fixture.innerHTML, 'second' );
});

test( 'Expression partials can be nested', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `{{>'NESTED'.toLowerCase()}}`,
		data: { x: 'a' },
		partials: {
			nested: `<p>{{>'child_' + x}}</p>`,
			child_a: '{{>foo}}',
			child_b: '{{>bar}}',
			foo: 'it works',
			bar: 'it still works'
		}
	});

	t.htmlEqual( fixture.innerHTML, '<p>it works</p>' );
	ractive.set( 'x', 'b' );
	t.htmlEqual( fixture.innerHTML, '<p>it still works</p>' );
});

test( 'Partials with expressions may also have context', function( t ) {
	new Ractive({
		el: fixture,
		template: '{{>(tpl + ".test") ctx}} : {{>"test." + tpl ctx.expr}}',
		data: {
			ctx: { id: 1, expr: { id: 2 } },
			tpl: 'foo'
		},
		partials: {
			'test.foo': 'normal - {{.id}}',
			'foo.test': 'inverted - {{.id}}'
		}
	});

	t.htmlEqual( fixture.innerHTML, 'inverted - 1 : normal - 2');
});

test( 'Partials with context should still have access to special refs (#2164)', t => {
	new Ractive({
		el: fixture,
		template: '{{>foo bar.baz}}',
		partials: {
			foo: `{{ @keypath + '.bop' }}`
		}
	});

	t.htmlEqual( fixture.innerHTML, 'bar.baz.bop' );
});

test( 'Partials .toString() works when not the first child of parent (#1163)', t => {
	const ractive = new Ractive({
		template: '<div>Foo {{>foo}}</div>',
		partials: { foo: '...' }
	});

	t.htmlEqual( ractive.toHTML(), '<div>Foo ...</div>' );
});

test( 'Dynamic partial works with merge (#1313)', t => {
	let fields = [
		{ type: 'text', value: 'hello' },
		{ type: 'number', value: 123 }
	];

	const ractive = new Ractive({
		el: fixture,
		template: `{{#fields}}{{> .type + 'Field' }}{{/}}`,
		partials: {
			textField: 'text{{value}}',
			numberField: 'number{{value}}'
		},
		data: { fields }
	});

	t.htmlEqual( ractive.toHTML(), 'texthellonumber123' );

	fields = [ fields[1], fields[0] ];
	ractive.merge( 'fields', fields );

	t.htmlEqual( ractive.toHTML(), 'number123texthello' );
});

test( 'Nameless expressions with no matching partial don\'t throw', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `{{> 'miss' + 'ing' }}`
	});

	t.htmlEqual( ractive.toHTML(), '' );
});

test( 'Partials can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `wrapped {{>'partial'}} around`,
		partials: {
			partial: 'inner'
		}
	});

	t.htmlEqual( fixture.innerHTML, 'wrapped inner around' );
	ractive.resetPartial( 'partial', 'ninner' );
	t.htmlEqual( fixture.innerHTML, 'wrapped ninner around' );
});

test( 'Partials with variable names can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: 'wrapped {{>partial}} around',
		partials: {
			foo: 'foo',
			bar: 'bar'
		}
	});

	t.htmlEqual( fixture.innerHTML, 'wrapped  around' );
	ractive.set( 'partial', 'foo' );
	t.htmlEqual( fixture.innerHTML, 'wrapped foo around' );
	ractive.resetPartial( 'foo', 'nfoo' );
	t.htmlEqual( fixture.innerHTML, 'wrapped nfoo around' );
	ractive.set( 'partial', 'bar' );
	t.htmlEqual( fixture.innerHTML, 'wrapped bar around' );
	ractive.resetPartial( 'bar', 'nbar' );
	t.htmlEqual( fixture.innerHTML, 'wrapped nbar around' );
});

test( 'Partials with expression names can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `wrapped {{>foo + 'Partial'}} around`,
		partials: {
			fooPartial: 'foo'
		}
	});

	t.htmlEqual( fixture.innerHTML, 'wrapped  around' );
	ractive.set( 'foo', 'foo' );
	t.htmlEqual( fixture.innerHTML, 'wrapped foo around' );
	ractive.resetPartial( 'fooPartial', 'nfoo' );
	t.htmlEqual( fixture.innerHTML, 'wrapped nfoo around' );
});

test( 'Partials inside conditionals can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `{{#cond}}{{>partial}}{{/}}`,
		partials: {
			partial: 'foo'
		}
	});

	t.htmlEqual( fixture.innerHTML, '' );
	ractive.set( 'cond', true );
	t.htmlEqual( fixture.innerHTML, 'foo' );
	ractive.resetPartial( 'partial', 'nfoo' );
	t.htmlEqual( fixture.innerHTML, 'nfoo' );
});

test( 'Partials (only) borrowed by components can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: '{{>foo}} {{>bar}} <component />',
		partials: {
			foo: 'rfoo',
			bar: 'rbar'
		},
		components: {
			component: Ractive.extend({
				template: '{{>foo}} {{>bar}}',
				partials: {
					bar: 'cbar'
				}
			})
		}
	});

	t.htmlEqual( fixture.innerHTML, 'rfoo rbar rfoo cbar' );
	ractive.resetPartial( 'foo', 'nrfoo' );
	t.htmlEqual( fixture.innerHTML, 'nrfoo rbar nrfoo cbar' );
	ractive.resetPartial( 'bar', 'nrbar' );
	t.htmlEqual( fixture.innerHTML, 'nrfoo nrbar nrfoo cbar' );
	ractive.findComponent('component').resetPartial('bar', 'ncbar');
	t.htmlEqual( fixture.innerHTML, 'nrfoo nrbar nrfoo ncbar' );
});

test( 'Partials inside iteratives can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: '{{#list}}{{>.type}}{{/}}',
		partials: {
			t1: 't1',
			t2: 't2'
		},
		data: {
			list: [ { type: 't1' }, { type: 't2' }, { type: 't1' } ]
		}
	});

	t.htmlEqual( fixture.innerHTML, 't1t2t1' );
	ractive.resetPartial( 't1', 'nt1' );
	t.htmlEqual( fixture.innerHTML, 'nt1t2nt1' );
	ractive.resetPartial( 't2', 'nt2' );
	ractive.resetPartial( 't1', '' );
	t.htmlEqual( fixture.innerHTML, 'nt2' );
});

test( 'Nested partials can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: '{{>outer}}',
		partials: {
			outer: 'outer({{>inner}})',
			inner: 'inner'
		}
	});

	t.htmlEqual( fixture.innerHTML, 'outer(inner)' );
	ractive.resetPartial( 'inner', 'ninner' );
	t.htmlEqual( fixture.innerHTML, 'outer(ninner)' );
	ractive.resetPartial( 'outer', '({{>inner}})outer' );
	t.htmlEqual( fixture.innerHTML, '(ninner)outer' );
	ractive.resetPartial( 'outer', 'outer' );
	t.htmlEqual( fixture.innerHTML, 'outer' );
});

test( 'Partials in context blocks can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `{{#with { ctx: 'foo' } }}{{>ctx}}{{/with}}`,
		partials: {
			foo: 'foo'
		}
	});

	t.htmlEqual( fixture.innerHTML, 'foo' );
	ractive.resetPartial( 'foo', 'nfoo' );
	t.htmlEqual( fixture.innerHTML, 'nfoo' );
});

test( 'Partials in attributes can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: '<div class="wrapped {{>foo}} around" id="{{>foo}}"></div>',
		partials: {
			foo: 'foo'
		}
	});

	t.htmlEqual( fixture.innerHTML, '<div class="wrapped foo around" id="foo"></div>' );
	ractive.resetPartial( 'foo', 'nfoo' );
	t.htmlEqual( fixture.innerHTML, '<div class="wrapped nfoo around" id="nfoo"></div>' );
});

test( 'Partials in attribute blocks can be changed with resetPartial', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `<div {{#cond}}class="wrapped {{>foo}} around" id="{{>foo}}" {{>attr}}{{/}}></div>`,
		partials: {
			foo: 'foo',
			attr: 'title="{{>foo}}"'
		}
	});

	t.htmlEqual( fixture.innerHTML, '<div></div>' );
	ractive.set( 'cond', true );
	t.htmlEqual( fixture.innerHTML, '<div class="wrapped foo around" id="foo" title="foo"></div>' );
	ractive.resetPartial( 'foo', 'nfoo' );
	t.htmlEqual( fixture.innerHTML, '<div class="wrapped nfoo around" id="nfoo" title="nfoo"></div>' );
	ractive.resetPartial( 'attr', 'alt="bar"' );
	t.htmlEqual( fixture.innerHTML, '<div class="wrapped nfoo around" id="nfoo" alt="bar"></div>' );
});

test( 'Partial naming requirements are relaxed', t => {
	new Ractive({
		el: fixture,
		template: `{{>a-partial}}{{>10-2}}{{>a - partial}}{{>delete}}`,
		partials: {
			'a-partial': 'a',
			8: 'b',
			delete: 'c'
		},
		data: {
			a: 10,
			partial: 2
		}
	});

	t.htmlEqual( fixture.innerHTML, 'abbc' );
});

test( 'Inline partials can override component partials', t => {
	new Ractive({
		el: fixture,
		template: `
			<Widget>
				{{#partial part}}
					inline
				{{/partial}}
			</Widget>
			<Widget/>
		`,
		components: {
			Widget: Ractive.extend({
				template: '{{>part}}',
				partials: { part: 'component' }
			})
		}
	});

	t.htmlEqual( fixture.innerHTML, 'inline component' );
});

test( 'Inline partials may be defined with a partial section', t => {
	new Ractive({
		el: fixture,
		template: `
			{{#partial foo}}foo{{/partial}}
			{{>foo}}
			<Widget/>
			<Widget>
				{{#partial foo}}bar{{/partial}}
			</Widget>`,
		components: {
			Widget: Ractive.extend({
				template: '{{>foo}}'
			})
		}
	});

	t.htmlEqual( fixture.innerHTML, 'foo foo bar' );
});

test( '(Only) inline partials can be yielded', t => {
	const Widget = Ractive.extend({
		template: '{{yield foo}}',
		partials: { foo: 'bar' }
	});

	new Ractive({
		el: fixture,
		template: `
			<Widget/>
			<Widget>{{#partial foo}}foo{{/partial}}</Widget>`,
		components: { Widget }
	});

	t.htmlEqual( fixture.innerHTML, 'foo' );
});

test( 'Don\'t throw on empty partial', t => {
	t.expect( 1 );

	new Ractive({
		el: fixture,
		template: '{{>empty}}',
		debug: true,
		partials: {
			empty: ''
		}
	});

	t.ok( true );
});

test( 'Dynamic empty partial ok', t => {
	const ractive = new Ractive({
		el: fixture,
		template: '{{>foo}}',
		debug: true,
		partials: {
			empty: '',
			'not-empty': 'bar'
		},
		data: { foo: 'not-empty' }
	});

	t.htmlEqual( fixture.innerHTML, 'bar' );
	ractive.set( 'foo', 'empty' );
	t.htmlEqual( fixture.innerHTML, '' );
	ractive.set( 'foo', 'not-empty' );
	t.htmlEqual( fixture.innerHTML, 'bar' );

});

test( 'Partials with expressions in recursive structures should not blow the stack', t => {
	new Ractive({
		el: fixture,
		template: '{{#items}}{{>\'item\'}}{{/}}',
		partials: {
			item: '{{.foo}}{{#.items}}{{>\'item\'}}{{/}}'
		},
		data: {
			items: [
				{ items: [{ foo: 'a', items: [{ foo: 'b' }] }] }
			]
		}
	});

	t.htmlEqual( fixture.innerHTML, 'ab' );
});

test( 'Named partials should not get rebound if they happen to have the same name as a reference (#1507)', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `
			{{#each items}}
				{{>item}}
			{{/each}}

			{{#if items.length > 1}}
				{{#with items[items.length-1]}}
					{{>item}}
				{{/with}}
			{{/if}}`,
		partials: {
			item: '{{item}}'
		},
		data: {
			items: []
		}
	});

	ractive.push( 'items', { item: 'a' } );
	ractive.push( 'items', { item: 'b' } );
	ractive.push( 'items', { item: 'c' } );

	t.htmlEqual( fixture.innerHTML, 'abc c' );
});

test( 'Partials from the template hierarchy should take precedent over references', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `<p>
			{{#partial item}}{{item}}{{/partial}}
			{{#each items}}
				{{>item}}
			{{/each}}

			{{#if items.length > 1}}
				{{#with items[items.length-1]}}
					{{>item}}
				{{/with}}
			{{/if}}
		</p>`,
		data: {
			items: []
		}
	});

	ractive.push( 'items', { item: 'a' } );
	ractive.push( 'items', { item: 'b' } );
	ractive.push( 'items', { item: 'c' } );

	t.htmlEqual( fixture.innerHTML, '<p> abc c</p>' );
});

test( 'Partial names can have slashes', t => {
	new Ractive({
		el: fixture,
		template: '<p>{{#partial foo/bar}}foobar{{/partial}}{{> foo/bar}}</p>'
	});

	t.htmlEqual( '<p>foobar</p>', fixture.innerHTML );
});

test( 'Several inline partials containing elements can be defined (#1736)', t => {
	const ractive = new Ractive({
		el: fixture,
		template: `
			{{#partial part1}}
				<div>inline1</div>
			{{/partial}}
			{{#partial part2}}
				<div>inline2</div>
			{{/partial}}

			A{{>part1}}B{{>part2}}C`
	});

	t.htmlEqual( fixture.innerHTML, 'A<div>inline1</div>B<div>inline2</div>C' );
	t.equal( ractive.partials.part1.length, 1 );
	t.equal( ractive.partials.part2.length, 1 );
});

test( 'Removing a missing partial (#1808)', t => {
	t.expect( 0 );

	const ractive = new Ractive({
		template: '{{#items}}{{>item}}{{/}}',
		el: 'main',
		data: {
			items: [ 1, 2, 3 ]
		}
	});

	ractive.unshift( 'items', 4 );
	ractive.shift( 'items' );
});

test( 'Dynamic partial can be set in oninit (#1826)', t => {
	new Ractive({
		el: fixture,
		template: '{{> partialName }}',
		partials: {
			one: 'onepart',
			two: 'twopart'
		},
		data: {
			partialName: 'one'
		},
		oninit () {
			this.set({partialName: 'two'});
		}
	});

	t.htmlEqual( fixture.innerHTML, 'twopart' );
});

test( 'Inline partials don\'t dissipate into the ether when attached to non-components (#1838)', t => {
	new Ractive({
		el: fixture,
		template: '<div>{{#partial foo}}foo{{/partial}}{{>foo}}</div>'
	});

	t.htmlEqual( fixture.innerHTML, '<div>foo</div>' );
});

test( 'Inline partials can override instance partials if they exist on a node directly up-hierarchy', t => {
	new Ractive({
		el: fixture,
		template: `{{#partial foo}}
				Something happens {{>here}}
			{{/partial}}

			<div>
				{{#partial here}}one{{/partial}}
				<span>{{>foo}}</span>
			</div>
			<div>
				{{#partial here}}two{{/partial}}
				<span>{{>foo}}</span>
			</div>`
	});

	t.htmlEqual( fixture.innerHTML, '<div><span>Something happens one</span></div><div><span>Something happens two</span></div>' );
});

test( 'resetting a dynamic partial to its reference name should replace the partial (#2185)', t => {
	const r = new Ractive({
		el: fixture,
		template: '{{>part1}}{{>part2}}',
		partials: { part3: 'part3' },
		data: { part1: 'part3', part2: 'nope' }
	});

	t.htmlEqual( fixture.innerHTML, 'part3' );

	r.resetPartial( 'part1', 'part1' );
	t.htmlEqual( fixture.innerHTML, 'part1' );

	r.resetPartial( 'part2', 'part2' );
	t.htmlEqual( fixture.innerHTML, 'part1part2' );
});

test( `Partials can have context that starts with '.' (#1880)`, t => {
	new Ractive({
		el: fixture,
		template: '{{#with foo}}{{>foo .bar}}{{/with}}',
		data: {
			foo: { bar: { baz: 'bat' } }
		},
		partials: {
			foo: '{{.baz}}'
		}
	});

	t.htmlEqual( fixture.innerHTML, 'bat' );
});
