var helper = {
  mergeobjCss: function (a, b) {
    ['normRule', 'fontFace', 'keyFram'].forEach(function (ele) {
      if (!a[ele] || !b[ele]) {
        // console.log('NO '+ele);
      }
      a[ele] = a[ele].concat(b[ele])
    });
  },
  normRuleNodeToText: function (node) {
    var s = "";
    node.nodes.forEach(function (ele, idx) {
      if (ele.prop && ele.value) {
        var before = ele.raws.before.replace(/[\s]*/, '');
        s += (before + ele.prop + ':' + ele.value + (ele.important ? '!important;' : ';'));
      }
    });
    return s
  },
  keyFramNodeToText: function (node) {
    var s = '@' + node.name + ' ' + node.params + '{';
    node.nodes.forEach(function (_node) {
      s += (_node.selector + '{' + helper.normRuleNodeToText(_node) + '}')
    });
    s += '}';
    return s
  },
  fontFaceNodeToText: function (node) {
    var s = '@' + node.name + '{';
    s += helper.normRuleNodeToText(node);
    s += '}';
    return s
  },
  textToCss: function (styleContent) {
    var doc = document, //.implementation.createHTMLDocument(""),
      styleElement = document.createElement("style"),
      resultCssRules;
    styleElement.innerText = styleContent;
    // the style will only be parsed once it is added to a document
    doc.body.appendChild(styleElement);
    resultCssRules = styleElement.sheet;
    doc.body.removeChild(styleElement);
    return resultCssRules;
  },
  getCSSClassName: function(name){
    // html 类似的类名，在 css 中需要转义 hover:before-1/4
    name = name.replace(/\:/g,'\:');
    name = name.replace(/\//g,'\/');
    return name;
  },
  // getHTMLClassName: function(name){
  //   // css 类似的类名，在 css 需要把转义去掉
  //   name = name.replace(/\\/g,'');
  //   return name;
  // }
  removeQuot: function(str){
    return str.replace(/^(['"])?(.*)\1$/, '$2');
  },
  fontStringify: function(o){
  // [ [ <'font-style'> || <'font-variant'> || <'font-weight'> ]? <'font-size'> [ / <'line-height'> ]? <'font-family'> ] | caption | icon | menu | message-box | small-caption | status-bar | inherit
	var lh = o.lineHeight;
	var size = o.size + (lh ? '/'+ lh : '');

	return [o.style, o.variant, o.weight, size, o.fontFamily].join(' ').trim().replace(/\s+/g, ' ');

  },
  fontParse: (function(){
    var sFontStyle = '(normal|italic|oblique|inherit)';
    var sFontVariant = '(normal|small-caps|inherit)';
    var sFontWeight = '(normal|bold|bolder|lighter|100|200|300|400|500|600|700|800|900|inherit)';
    var sFontSizeKeyword = '(xx-small|x-small|small|medium|large|x-large|xx-large|larger|smaller)';
    var sFontSizeLength = '((?:\\d*)(?:\\.\\d*)?(?:px|em|%|))';
    var sFontSize = '('+ sFontSizeKeyword + '|' + sFontSizeLength +')';
    var sFontPropExt = 'caption|icon|menu|message-box|small-caption|status-bar|inherit';

    var rFontStyle = new RegExp(sFontStyle, 'i');
    var rFontVariant = new RegExp(sFontVariant, 'i');
    var rFontWeight = new RegExp(sFontWeight, 'i');
    var rFontSize = new RegExp(sFontSize, 'i');
    var rFontLineHeight = new RegExp('/' + sFontSizeLength, 'i');

    // [ [ <'font-style'> || <'font-variant'> || <'font-weight'> ]? <'font-size'> [ / <'line-height'> ]? <'font-family'> ] | caption | icon | menu | message-box | small-caption | status-bar | inherit


    function getValue (match) {
      return match ? match[0].trim() : '';
    }

    return function (str) {
      str = str.trim();
      var str_o = str;
      var idx = 0;

      var style = rFontStyle.exec(str);
      style = getValue(style);
      str = str.replace(style, '').trim();

      var variant = rFontVariant.exec(str);
      variant = getValue(variant);
      str = str.replace(variant, '').trim();

      var weight = rFontWeight.exec(str);
      weight = getValue(weight);
      str = str.replace(weight, '').trim();

      var size = rFontSize.exec(str);
      // console.log('size', size);
      size = getValue(size);
      str = str.replace(size, '').trim();

      var lineHeight = rFontLineHeight.exec(str);
      lineHeight = getValue(lineHeight);
      str = str.replace(lineHeight, '').trim();
      lineHeight = lineHeight.slice(1);

      var fontFamily = str.trim();

      return {
        style: style,
        variant: variant,
        weight: weight,
        size: size,
        lineHeight: lineHeight,
        fontFamily: fontFamily,
        string: str_o
      };
    }
  })()
}


module.exports = helper;