/* global chrome */

// this module is used to filter rules
// by testing the dom and its children one by one.
// each testing is wrapped by a settimeout timmer to make it async
// because the testing can be a long time if too many.
// development | production
var debugMode = process.env.NODE_ENV!=='production';
const useNamespace = debugMode? false: true;
const cssHelper = require('./cssHelper');
const getHash = require('./getHash');
const MiniIdGenerator = require('./MiniIdGenerator');
const selectorParser = require('postcss-selector-parser');

// may match accoding to interaction
const PseudoClass = '((-(webkit|moz|ms|o)-)?(full-screen|fullscreen))|-o-prefocus|active|checked|disabled|empty|enabled|focus|hover|in-range|invalid|link|out-of-range|target|valid|visited',
  PseudoElement = '((-(webkit|moz|ms|o)-)?(focus-inner|input-placeholder|placeholder|selection|resizer|scrollbar(-(button|thumb|corner|track(-piece)?))?))|-ms-(clear|reveal|expand)|-moz-(focusring)|-webkit-(details-marker)|after|before|first-letter|first-line',
  MaxPossiblePseudoLength=30,
  REG0=new RegExp('^(:(' + PseudoClass + ')|::?(' + PseudoElement + '))+$', ''),
  REG1=new RegExp('( |^)(:(' + PseudoClass + ')|::?(' + PseudoElement + '))+( |$)', 'ig'),
  REG2=new RegExp('\\((:(' + PseudoClass + ')|::?(' + PseudoElement + '))+\\)', 'ig'),
  REG3=new RegExp('(:(' + PseudoClass + ')|::?(' + PseudoElement + '))+', 'ig');


  
  const removePseudos = (function(){
    const processor = selectorParser(selectors => {
      selectors.walkPseudos(selector => {
          selector.remove();
      });
    });
    return function(selector){
      return processor.processSync(selector);
    };
  })();

  
  

function filterRules($0, objCss, taskTimerRecord) {

  var promises = [];
  var matched = [];
  var keyFramUsed = [];
  var fontFaceUsed = [];

  // 克隆一个节点，方便后面修改 html, 如改 class 名
  var container = $0.cloneNode(true);
  var domlist = [];
  domlist.push(container);
  Array.prototype.forEach.call(container.querySelectorAll('*'), function (e) {
    domlist.push(e);
  });

  return new Promise(function (resolve, reject) {
    // loop every dom
    objCss.normRule.forEach(function (rule, idx) {
      promises.push(new Promise(function (res, rej) {
        var timer = setTimeout(function () {
          if (idx % 1000 === 0) {
            chrome.runtime.sendMessage({
              dom: domlist.length - 1,
              rule: objCss.normRule.length,
              rulenow: idx
            });
          }

          if (typeof rule === 'string') {
            res(rule);
            return;
          } else {
            var selMatched = [];
            var arrSel = rule.selectors.filter(function (v, i, self) {
              return self.indexOf(v) === i;
            });
            arrSel.forEach(function (sel, i) {
              if (selMatched.indexOf(sel) !== -1) {
                return;
              }
              
              // these pseudo class/elements can apply to any ele
              // but wont apply now 
              // eg. :active{xxx}
              // only works when clicked on and actived
              if (sel.length<MaxPossiblePseudoLength && sel.match(REG0)){
                selMatched.push(sel);
              } else {
                let count = [];

                // 删除伪类
                let replacedSel = removePseudos(sel);

                try {
                  if (container.matches(replacedSel) || container.querySelectorAll(replacedSel).length !== 0) {
                    selMatched.push(sel);
                  }
                } catch (e) {
                  count.push(replacedSel);
                  count.push(e);
                }
                if (count.length === 4 && debugMode) {
                  if (count[2] === count[0]) {
                    count = count.slice(0, 2);
                  }
                  console.log(count);
                }
              }
            });
            if (selMatched.length !== 0) {
              
              
              var selector = selMatched.filter(function (v, i, self) {
                return self.indexOf(v) === i;
              }).join(',');

              var content = '{' + cssHelper.normRuleNodeToText(rule) + '}';
              
              res({
                selector,
                content,
                rule
              });

              // 检查使用了哪些字体，把样式直接渲染到页面，可以直接从类似
              // document.styleSheets[0].cssRules[17].style.fontFamily 属性获取字体
              // 不用解析
              // let fontfamilyOfRule = cssHelper.textToCss(selector+content);
              // if (fontfamilyOfRule.cssRules[0] && fontfamilyOfRule.cssRules[0].style.fontFamily) {
              //   fontFaceUsed = fontFaceUsed.concat(fontfamilyOfRule.cssRules[0].style.fontFamily.split(', '));
              // }
              // return;
            }
          }
          res('');
        }, 0);
        taskTimerRecord.push(timer);
      }));
    });

    Promise.all(promises).then(function (result) {

      // 生成用到的 css，用于生成 hash 
      const css = (function(){
        const content = [];
        result.forEach(function (ele) {
          if(ele){
            if( ele.selector && ele.content){
              content.push(ele.selector+ele.content);
            }
          }
        });
        return content.join('');
      })();

      // 重命名信息
      const renameMap = {
        clz:{

        },
        font: {

        },
        key: {

        }
      };

      // 获取新 id
      const getId = (function(){
        const hash = getHash(JSON.stringify(css));
        const getMiniId = new MiniIdGenerator(); 
        return function(content, type){
          type = type || 'clz';
          let key = content.toString();
          let prefix = '';
          if(type!=='clz'){
            prefix = type+'-';
          }
          return renameMap[type][key] = renameMap[type][key]|| (prefix + getMiniId()+'-'+hash);
        };
      })();

      const fontFamilyRename = function(fontfamily){
        return (fontfamily.split(',').map(function(item){
          const name = cssHelper.removeQuot(item);
          return fontFaceDefined.indexOf(name)>-1? getId(name,'font'): name;
        })).join(',');
      };
      // 按 rule 来修改字体和动画名
      const fontKeyRename = function(rule){
        rule.nodes.forEach(function (ele, idx) {
          const prop = ele.prop;
          const value = ele.value;
    
          // 检查使用了哪些动画
          if (prop && prop.match(/^(-(webkit|moz|ms|o)-)?animation(-name)?$/i) !== null) {
            // 定义多个动画
            const animations = value.split(/ *, */);

            const keyFramNames = animations.map(function (animation, index) {
              // 每个动画里用空格隔开，开头是动画名
              const animationInfo = animation.split(' ');
              const keyFram = animationInfo[0];
    
              // 每个动画改名
              animationInfo[0] = keyFramDefined.indexOf(keyFram)>-1?getId(keyFram, 'key'): keyFram;

              animations[index] = animationInfo.join(' ');
              // animations[index][0] = keyFramDefined.indexOf(keyFram)>-1?getId(keyFram, 'key'): keyFram;
    
              return keyFram;
            });
            
            keyFramUsed = keyFramUsed.concat(keyFramNames);
    
            // 整个动画修改（里面多个动画名改了）
            ele.value = animations.join(',');
    
          }else if(prop === 'font'){
    
            // 解析字体
            const font = cssHelper.fontParse(value);
            if(font){
              font.fontFamily = fontFamilyRename(font.fontFamily);
              ele.value = cssHelper.fontStringify(font);
            }
          }else if(prop === 'font-family'){
            ele.value = fontFamilyRename(value)
          }
    
        });
        return rule;
      };


       // 用户自定义了哪些字体和动画
      const keyFramDefined = objCss.keyFram.map(function (e) {
        return e.params;
      });

      const fontFaceDefined = [];
      objCss.fontFace.forEach(function (e) {
        e.nodes.forEach(function (n) {
          if(n.prop === 'font-family' && n.value){
            fontFaceDefined.push(cssHelper.removeQuot(n.value));
          }
        });
      })


      const selectorProcessor = selectorParser(selectors => {
        // css class 改名
        selectors.walkClasses(function(node){
          node.value = getId(node.value, 'clz');
        });
        // if (ids) selectors.walkIds(renameNode);
      });

      keyFramUsed = keyFramUsed.filter(function (v, i, self) {
        return self.indexOf(v) === i;
      });
      fontFaceUsed = fontFaceUsed.filter(function (v, i, self) {
        return self.indexOf(v) === i;
      });

      result.forEach(function (ele) {
        if(ele){
          if (typeof ele ==='string' & ele.length > 0) {
            matched.push(ele);
          }else{
            if(useNamespace){
              if( ele.rule ){
                // 改字体动画名
                ele.rule = fontKeyRename(ele.rule);
                ele.content = '{' + cssHelper.normRuleNodeToText(ele.rule) + '}';
              }
              if( ele.selector && ele.content){
                // 改 class 名
                ele.selector = selectorProcessor.processSync(ele.selector);
                ele.content = '{' + cssHelper.normRuleNodeToText(ele.rule) + '}';
              }
            }
            
            matched.push(ele.selector + ele.content);
          }
        }
      });

      // 只保留使用到的动画
      var frameCommentMarkUsed = false;
      keyFramUsed.forEach(function ( name) {
        objCss.keyFram.forEach(function (e) {
          if ( name === e.params) {
            if (!frameCommentMarkUsed) {
              matched.push('/*! Keyframes */');
              frameCommentMarkUsed = true;
            }

            // 改动画名
            const newName = renameMap['key'][name];
            if(newName){
              e.params = newName;
            }

            matched.push(cssHelper.keyFramNodeToText(e));
          }
        })
      });

      // 只保留使用到的字体
      var fontCommentMarkUsed = false;
      fontFaceUsed.forEach(function (name) {
        
        objCss.fontFace.forEach(function (e) {
          e.nodes.forEach(function (n) {
            if (n.prop === 'font-family' && name === cssHelper.removeQuot(n.value) ) { // 相等说明有使用这个字体
              if (!fontCommentMarkUsed) {
                matched.push('/*! Fontfaces */');
                fontCommentMarkUsed = true;
              }

              // 改成新名字
              const newName = renameMap['font'][name];
              if( newName){
                n.value = newName;
              }

              matched.push(cssHelper.fontFaceNodeToText(e));
            }
          })

        })
      });

      // html 改 class 名
      (function(){
        const classes = [];
        for (const key in renameMap['clz']) {
          if (Object.hasOwnProperty.call(renameMap['clz'], key)) {
            // const element = renameMap['clz'][key];
            classes.push('.'+ key);
          }
        }
        const selectors = classes.join(', ');
        let allElements = [];
        try {
          allElements = Array.prototype.slice.call(container.querySelectorAll(selectors));
        } catch (error) {
          console.log(error);
          console.log('改用*选择所带 class 的元素');
          allElements = Array.prototype.slice.call(container.querySelectorAll('[class]'));
        }
        allElements.push(container);
        allElements.map(function(item, index){

          // svg 的 className 不是字符串，是一个 SVGAnimatedString  对象，需要使用 classList 方法
          let classList = item.classList;
          classList.forEach(function( item1 ){

            // html 类似的类名，在 css 中需要转义 hover:before-1/4  => hover\:before-1\/4
            let key = cssHelper.getCSSClassName(item1);

            const newName = renameMap['clz'][key];
            if(newName){
              classList.replace(item1, newName);
            }
          });
          
        });

      })();
      
      
      resolve({
        css: matched,
        html:container.outerHTML
      });
    }).catch(function (err) {
      reject(err);
    });
  });
}

module.exports = filterRules;