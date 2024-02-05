// 游戏主体
let game;

// 游戏的基本配置信息，用于创建游戏画布
const gameOptions = {
  gameWidth: 800,    // 游戏宽度，以像素为单位
  gameHeight: 1300,   // 游戏高低，以像素为单位
  tileSize: 100,     // 瓦片（一个格子）的尺寸，以像素为单位
  fieldSize: 8, // 场地大小，场地应该是正方形的，这样才能流畅地进行游戏，这里设置为 8 X 8 的矩阵
  colors: [0xff0000, 0x00ff00, 0x0000ff, 0xffff00], // 瓦片（格子）的颜色
  tiles: ['dog', 'cat', 'gh', 'tu'] // 四种格子元素
}

// 一些常量，用于存储矩阵网格的格子数据
const _HERO = 1;
const _KEY = 2;
const _LOCKEDDOOR = 3;
const _GAMETIME = 10 // 游戏倒计时时长

const _LEVEL = {
  1: '一马当先',
  2: '二横开泰',
  3: '三生有幸',
  4: '四季如春',
  5: '五福东海',
  6: '六六大顺',
  7: '七嘴八舌',
  8: '八仙过海',
  9: '九九归一',
  10: '十分顺利'
}

// 让它在页面加载后执行
window.onload = function () {

  // 使用Phaser引擎创建一个游戏
  game = new Phaser.Game(gameOptions.gameWidth, gameOptions.gameHeight);

  // 添加游戏
  game.state.add("TheGame", TheGame);

  // 启动游戏
  game.state.start("TheGame");
}

class TheGame {
  constructor() { }

  // 资源预加载，会在phaser预加载期间执行，可以实时监控资源加载的进度
  preload() {

    // 设置舞台背景色
    game.stage.backgroundColor = 0x222222;

    // 加载瓦片资源
    game.load.spritesheet("cat", "./assets/mao.png", gameOptions.tileSize, gameOptions.tileSize);
    game.load.spritesheet("dog", "./assets/gou.png", gameOptions.tileSize, gameOptions.tileSize);
    game.load.spritesheet("chicken", "./assets/ji.png", gameOptions.tileSize, gameOptions.tileSize);
    game.load.spritesheet("tu", "./assets/tu.png", gameOptions.tileSize, gameOptions.tileSize);
    game.load.spritesheet("gh", "./assets/gh.png", gameOptions.tileSize, gameOptions.tileSize);

    // 加载按钮资源
    game.load.image('button', "./assets/anniu.png")

    // 加载背景资源
    game.load.image('bg', "./assets/bg.png")
    game.load.image('bg1', "./assets/bg1.png")

  }

  // 创建游戏画布，在游戏完全加载后立即执行
  create() {

    // 将游戏覆盖整个屏幕，同时保持其比例
    game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;

    // 游戏水平居中
    game.scale.pageAlignHorizontally = true;

    // 游戏垂直居中
    game.scale.pageAlignVertically = true;

    // 创建游戏
    this.createMatrix();
    this.tileGroup.visible = false
    this.canPick = false
    this.finishAnimation = true
    // 创建关卡
    this.createLevel()
  }

  // 创建游戏元素
  createMatrix() {

    // canPick告诉我们，如果我们可以选择一个贴图，我们从“true”开始，有一个贴图可以被选择
    this.canPick = true;

    // tiles保存在一个名为tilesArray的数组中
    this.tilesArray = [];

    const bg = game.add.tileSprite(0, 0, game.width, game.height, 'bg1');
    bg.tint = 0xcccccc

    // 这个组将包含所有的贴图
    this.tileGroup = game.add.group();

    // 用来存储存所有瓦片格子的位置
    this.specialItemCandidates = [];

    // 矩阵的网格，由x轴和y轴组成，矩阵的x轴和y轴数量由gameOptions的x和y构成
    for (let i = 0; i < gameOptions.fieldSize; i++) {
      this.tilesArray[i] = [];
      for (let j = 0; j < gameOptions.fieldSize; j++) {

        // 创建格子元素
        this.addTile(i, j);

        // 将每个坐标添加到数组中
        this.specialItemCandidates.push(new Phaser.Point(j, i));
      }
    }

    // 随机选择一个位置放置障碍物
    this.heroLocation = Phaser.ArrayUtils.removeRandomItem(this.specialItemCandidates);

    // 调整画布
    this.tilesArray[this.heroLocation.y][this.heroLocation.x].tileSprite.frame = _HERO;

    // 调整格子的值。我们可以通过给帧添加10来定义特殊的贴图值
    // this.tilesArray[this.heroLocation.y][this.heroLocation.x].value = 10 + _HERO;

    // 我们还必须通过应用白色着色来去除着色
    this.tilesArray[this.heroLocation.y][this.heroLocation.x].tileSprite.tint = 0xffffff;

    // 我们在画布中以水平和垂直方式居中
    const fieldWidth = gameOptions.tileSize * gameOptions.fieldSize;

    // 将组放在画布的中间
    this.tileGroup.x = (game.width - fieldWidth) / 2;
    this.tileGroup.y = (game.height - fieldWidth) / 2;

    // 设置组，让它的焦点保持在重点位置
    this.tileGroup.pivot.set(fieldWidth / 2, fieldWidth / 2);

    // 调整分组位置，使其保持在之前分配的位置
    this.tileGroup.position.set(this.tileGroup.x + this.tileGroup.pivot.x, this.tileGroup.y + this.tileGroup.pivot.y);

    // 我们将绘制一个蒙版来隐藏从上面落下的方块。蒙版需要有相同的大小和位置的组
    this.tileMask = game.add.graphics(this.tileGroup.x - this.tileGroup.pivot.x, this.tileGroup.y - this.tileGroup.pivot.y);
    this.tileMask.beginFill(0xffffff);
    this.tileMask.drawRect(0, 0, fieldWidth, fieldWidth);
    this.tileGroup.mask = this.tileMask;
    this.tileMask.visible = false;

    // 它将包含被回收的已移除的格子
    this.tilePool = [];

    // 添加一个分数文案，记录分数
    this.score = 0
    this.scoreText = game.add.text(game.world.centerX, 80, `${this.score}分`, { font: "70px serif", fill: "#ffffff", align: "center", fontWeight: "bold" })
    // 设置锚点居中
    this.scoreText.anchor.set(0.5, 0.5)

    // 添加一个倒计时
    this.gameTime = _GAMETIME
    // 倒计时文案
    this.gameTimeText = game.add.text(game.world.centerX, 150, `倒计时：${this.gameTime}`, { font: "45px serif", fill: "#ffffff", align: "center" })
    // 设置锚点居中
    this.gameTimeText.anchor.set(0.5, 0.5)

    // 游戏关卡
    this.gameLevelText = game.add.text(game.world.centerX, 1200, `第${this.levelCount || 1}关`, { font: "45px serif", fill: "#ffffff", align: "center" })
    // 设置锚点居中
    this.gameLevelText.anchor.set(0.5, 0.5)

    // 玩家点击事件
    game.input.onDown.add(this.pickTile, this);
  }

  // 创建关卡
  createLevel() {
    // 关卡元素组合
    this.levelGroup = game.add.group()
    // 使用画板绘制关卡背景色
    // const levelBg = game.add.graphics(0, 0)
    //   .beginFill(0xffffff)
    //   .drawRect(0, 0, game.width, game.height)
    //   .endFill();

    const levelBg = game.add.tileSprite(0, 0, game.width, game.height, 'bg');
    levelBg.tint = 0xe4e4e4
    // 关卡等级
    this.levelCount = 1
    // 关卡显示文案
    const levelTextStyle = { font: "120px serif", fill: "#ffffff", align: "center" }
    this.levelText = game.add.text(game.world.centerX, game.world.centerY - 140, `第${this.levelCount}关`, levelTextStyle)
    // 设置锚点居中
    this.levelText.anchor.set(0.5, 0.5)
    // 关卡
    const levelDesStyle = { font: "60px serif", fill: "#ffffff", align: "center", fontWeight: "bold" }
    this.levelDes = game.add.text(game.world.centerX, game.world.centerY, _LEVEL[this.levelCount], levelDesStyle)
    this.levelDes.anchor.set(0.5, 0.5)
    // 开始按钮背景
    const button = game.add.button(game.world.centerX, game.world.centerY + 100, "button", function () {
      // 显示游戏矩阵视图
      this.tileGroup.visible = true
      // 启动倒计时
      this.setGameTimer()
      // 隐藏关卡展示
      this.levelGroup.visible = false
      // 500毫秒之后才可以点击，防止玩家手速过快，点击确认就立马被触发
      setTimeout(() => {
        this.canPick = true
      }, 500);
    }, this);
    button.anchor.set(0.5, 0)
    // 按钮文字
    const startText = game.add.text(game.world.centerX, game.world.centerY + 145, "开始游戏", { font: "30px serif", fill: "#ffffff", align: "center" })
    startText.anchor.set(0.5, 0.5)

    // 将上面元素都添加都这个组里面，统一管理
    this.levelGroup.add(levelBg)
    this.levelGroup.add(this.levelText)
    this.levelGroup.add(this.levelDes)
    this.levelGroup.add(button)
    this.levelGroup.add(startText)
  }

  // 计时器，关卡累加器
  setGameTimer() {
    this.gameTimer = setInterval(() => {
      if (this.gameTime > 0) {
        this.gameTime -= 1
        this.gameTimeText.text = `倒计时：${this.gameTime}`
      } else {
        // 动画未执行完毕，直接退出
        if (!this.finishAnimation) return
        this.replayGame()
      }
    }, 1000);
  }

  // 重新开始游戏
  replayGame() {
    this.canPick = false
    this.levelGroup.visible = true
    this.levelCount += 1
    this.levelText.text = `第${this.levelCount}关`
    this.levelDes.text = _LEVEL[this.levelCount] || '天下无敌，你最牛逼'
    this.gameLevelText.text = `第${this.levelCount}关`
    this.tileGroup.visible = false
    clearInterval(this.gameTimer)
    // 重置倒计时时间
    this.gameTime = _GAMETIME
    this.gameTimeText.text = `倒计时：${this.gameTime}`

    // 增加游戏难度，给两个障碍物
    if (this.score > this.levelCount * 10 && this.levelCount <= 10) {
      // 随机选取元素（这其中会包含重复的value）
      do {
        var keyLocation = Phaser.ArrayUtils.removeRandomItem(this.specialItemCandidates);
      } while (this.isAdjacent(this.heroLocation, keyLocation));
      this.tilesArray[keyLocation.y][keyLocation.x].tileSprite.frame = _KEY;
      this.tilesArray[keyLocation.y][keyLocation.x].value = 10 + _KEY; // 设置为独立的key，让它不被同类型格子元素销毁
      this.tilesArray[keyLocation.y][keyLocation.x].tileSprite.tint = 0x000000; // 设置背景会黑色（黑化）

      // 随机选取格子可能会遇到已经被黑化的情况，要果过滤掉
      // 在isAdjacent函数内进行调整
      do {
        var lockedDoorLocation = Phaser.ArrayUtils.removeRandomItem(this.specialItemCandidates);
      } while (this.isAdjacent(this.heroLocation, lockedDoorLocation));
      this.tilesArray[lockedDoorLocation.y][lockedDoorLocation.x].tileSprite.frame = _LOCKEDDOOR;
      this.tilesArray[lockedDoorLocation.y][lockedDoorLocation.x].value = 10 + _LOCKEDDOOR;
      this.tilesArray[lockedDoorLocation.y][lockedDoorLocation.x].tileSprite.tint = 0x000000;
    }
  }

  // 创建消消乐水平和垂直给格子的画布图
  addTile(row, col) {

    // 根据瓦片大小确定x轴和y轴瓦片位置
    const tileXPos = col * gameOptions.tileSize + gameOptions.tileSize / 2;
    const tileYPos = row * gameOptions.tileSize + gameOptions.tileSize / 2;

    // 给格子分配一个随机值，通过这个值来检查是否属于同类
    const tileValue = game.rnd.integerInRange(0, gameOptions.tiles.length - 1);

    // 创建一个由图片制作的瓦片
    const theTile = game.add.sprite(tileXPos, tileYPos, gameOptions.tiles[tileValue]);

    // 设置贴图的注册点到它的中心
    theTile.anchor.set(0.5);

    // 根据瓦片的大小调整瓦片的宽度和高度
    theTile.width = gameOptions.tileSize;
    theTile.height = gameOptions.tileSize;

    // 设置填充色
    // theTile.tint = gameOptions.tiles[tileValue];

    // 创建一个数组，图像收集到tilesArray数组内
    // 最终形成的就是我们看到的整体布局
    this.tilesArray[row][col] = {
      tileSprite: theTile, // 画布图像，格子
      isEmpty: false, // 判断在矩阵的当前位置是否为空（被消掉），为空则创建新的瓦片填充进来
      coordinate: new Phaser.Point(col, row), // 存储瓦片坐标，在新的瓦片填充期间有用
      value: tileValue // 瓦片的值
    };

    // 并将其添加到格子数组
    this.tileGroup.add(theTile);
  }

  // 在玩家点击或触摸时执行
  pickTile(e) {

    // 判断是否可以点击，在瓦片还在填充期间是不可以点击的
    if (this.canPick) {

      // 确定tileGroup内触摸的x和y位置
      const posX = e.x - this.tileGroup.x + gameOptions.tileSize * gameOptions.fieldSize / 2;
      const posY = e.y - this.tileGroup.y + gameOptions.tileSize * gameOptions.fieldSize / 2;

      // 将坐标转换为实际的行和列
      const pickedRow = Math.floor(posY / gameOptions.tileSize);
      const pickedCol = Math.floor(posX / gameOptions.tileSize);

      // 检查行和列是否在实际的游戏领域内
      if (pickedRow >= 0 && pickedCol >= 0 && pickedRow < gameOptions.fieldSize && pickedCol < gameOptions.fieldSize) {

        // 选中的格子
        const pickedTile = this.tilesArray[pickedRow][pickedCol];

        this.filled = [];
        this.filled.length = 0;

        // 在选定的格子上执行填充
        this.floodFill(pickedTile.coordinate, pickedTile.value);

        // x轴和y轴相关联的数量至少要3个才执行消除操作，这里可以设置
        if (this.filled.length > 2) {

          // 玩家将不能点击其他的格子，直到所有的动画播放完毕
          this.canPick = false;

          // 销毁选中的格子以及x轴y轴相关的格子
          this.destroyTiles();
        }
      }
    }
  }

  // 这个函数将会销毁我们选中的所有格子
  destroyTiles() {
    this.finishAnimation = false
    // 循环遍历数组，逐个删除所有元素
    do {
      // 移除数组的第一个格子元素
      const element = this.filled.shift();

      // 给格子销毁渐变动画
      const tween = game.add.tween(this.tilesArray[element.y][element.x].tileSprite).to({
        alpha: 0
      }, 300, Phaser.Easing.Linear.None, true);

      // placing the sprite in the array of sprites to be recycled
      this.tilePool.push(this.tilesArray[element.y][element.x].tileSprite);

      // 当补间动画执行完毕
      tween.onComplete.add(function (e) {

        // 重置补间动画
        e.frame = 0

        // 我们不知道我们已经删除了多少个格子，所以计算当前正在使用的补间是一个好方法
        // 我们假设，这是最后一个补间 (只有一个补间在运行)
        if (tween.manager.getAll().length === 1) {

          // 执行格子下降动画
          this.fillVerticalHoles();
        }
      }, this);

      // 现在格子是空的
      this.tilesArray[element.y][element.x].isEmpty = true;

      // 我们将重复这个循环，直到有东西填充进数组
    } while (this.filled.length > 0)
  }

  // 这个函数负责让新的格子落下来
  fillVerticalHoles() {

    // 定义个变量，用来告诉我们是否填满了被销毁的格子位置
    let filled = false;

    for (let i = gameOptions.fieldSize - 2; i >= 0; i--) {
      for (let j = 0; j < gameOptions.fieldSize; j++) {

        // 如果格子不为空
        if (!this.tilesArray[i][j].isEmpty) {

          // 让我们数一下在这块瓷砖下面能找到多少个空的坐标位置
          let holesBelow = this.countSpacesBelow(i, j);

          // 如果留空的位置大于零
          if (holesBelow) {

            // 我们填了一个留空的位置，要处理一下它
            filled = true;

            // 函数将列“j”的平铺从“i”移到“i + holesBelow”行
            this.moveDownTile(i, j, i + holesBelow, false);
          }
        }
      }
    }

    // 如果遍历所有的格子，没有完全填充满，则结束执行
    if (!filled) {

      // 动画执行完毕
      this.endMove();
    }

    // 现在是时候重用池中保存的tiles (tilePool数组)了，让我们从遍历每一列开始
    for (let i = 0; i < gameOptions.fieldSize; i++) {

      // 计算每一列有多少空格
      const topHoles = this.countSpacesBelow(-1, i);

      // 然后遍历每一个空格
      for (let j = topHoles - 1; j >= 0; j--) {

        // 设置随机值
        const tileValue = game.rnd.integerInRange(0, gameOptions.tiles.length - 1);

        // 让它下落到留空的y轴
        const tileYPos = (j - topHoles) * gameOptions.tileSize + gameOptions.tileSize / 2 - 100;
        // x轴
        const tileXPos = i * gameOptions.tileSize + gameOptions.tileSize / 2;

        // 随机创建新的格子元素
        const reusedTile = game.add.sprite(tileXPos, tileYPos, gameOptions.tiles[tileValue]);

        // 设置格子的注册点到它的中心
        reusedTile.anchor.set(0.5);

        // 根据瓦片的大小调整瓦片的宽度和高度
        reusedTile.width = gameOptions.tileSize;
        reusedTile.height = gameOptions.tileSize;

        // 填充背景色
        // reusedTile.tint = gameOptions.tiles[tileValue];

        // 设置新的格子元素
        this.tilesArray[j][i] = {
          tileSprite: reusedTile,
          isEmpty: false,
          coordinate: new Phaser.Point(i, j),
          value: tileValue
        }

        // 添加到格子数组中，目的是为了让格子滑动的位置基于格子矩阵顶部水平线
        this.tileGroup.add(reusedTile)

        // 让格子移动到下面，并且填充到指定位置
        this.moveDownTile(0, i, j, true);
      }
    }
  }

  // 计算被销毁的格子数量，并返回结果
  countSpacesBelow(row, col) {
    let result = 0;
    for (let i = row + 1; i < gameOptions.fieldSize; i++) {
      if (this.tilesArray[i][col].isEmpty) {
        result++;
      }
    }
    return result;
  }

  // 向下移动铺满被消除的格子位置
  moveDownTile(fromRow, fromCol, toRow, justMove) {

    // 一个格子可以只是移动(当它是一个“新的”格子从上面落下)
    // 必须移动更新游戏画布位置(当它是一个“旧”格子从之前的位置下降)，justMove标志处理此操作
    if (!justMove) {

      // 将格子本身及其值保存在临时变量中
      const tileToMove = this.tilesArray[fromRow][fromCol].tileSprite;
      const tileValue = this.tilesArray[fromRow][fromCol].value;

      // 调整格子数组，在新的位置创建格子
      this.tilesArray[toRow][fromCol] = {
        tileSprite: tileToMove,
        isEmpty: false,
        coordinate: new Phaser.Point(fromCol, toRow),
        value: tileValue
      }

      // 旧的的位置现在设置为空
      this.tilesArray[fromRow][fromCol].isEmpty = true;
    }

    // 移动的距离，以像素为单位（以此作为动画时长的值）
    const distanceToTravel = (toRow * gameOptions.tileSize + gameOptions.tileSize / 2) - this.tilesArray[toRow][fromCol].tileSprite.y

    // 每个格子都有独立的补间动画效果
    const tween = game.add.tween(this.tilesArray[toRow][fromCol].tileSprite).to({
      y: toRow * gameOptions.tileSize + gameOptions.tileSize / 2
    }, distanceToTravel / 2, Phaser.Easing.Linear.None, true);

    // 看看有多少补间动画还在执行者，如果这是最后一个活动补间，格子的移动流程就完成了
    tween.onComplete.add(function () {
      if (tween.manager.getAll().length === 1) {
        // 分数累加，一次加 10
        this.score += 10
        // 改变画布视图的文案
        this.scoreText.text = `${this.score}分`
        // 处理善后
        this.endMove();
        setTimeout(() => {
          // 设置完成动画
          this.finishAnimation = true
          // 计时器提前结束，进入关卡界面
          if (this.gameTime === 0) this.replayGame()
        }, 200);

        // if (this.score >= this.levelCount * 20) {
        //   this.canPick = false
        //   setTimeout(() => {
        //     this.levelGroup.visible = true
        //     this.levelCount += 1
        //     this.levelText.text = `第${this.levelCount}关`
        //     this.levelDes.text = _LEVEL[this.levelCount] || '天下无敌，你最牛逼'
        //     this.tileGroup.visible = false
        //   }, 200)
        // }

      }
    }, this);
  }

  // 计算一列有多少个留空的位置，并返回结果
  tilesInColumn(col) {
    let result = 0;
    for (let i = 0; i < gameOptions.fieldSize; i++) {
      if (!this.tilesArray[i][col].isEmpty) {
        result++;
      }
    }
    return result;
  }

  // 格子下落动画执行完毕之后，做一些善后的问题
  endMove() {
    this.filled = [];
    if (this.filled.length > 0) {
      // 销毁对应的格子
      this.destroyTiles();
    }
    else {
      // 玩家可以再次点击了
      this.canPick = true;
    }
  }

  // 找到匹配的格子，并且返回
  findItem(item) {
    for (let i = 0; i < gameOptions.fieldSize; i++) {
      for (let j = 0; j < gameOptions.fieldSize; j++) {
        if (this.tilesArray[i][j].value === 10 + item) {
          return this.tilesArray[i][j];
        }
      }
    }
  }

  // 检查两个瓷砖是否相邻，包括对角线
  isAdjacent(p1, p2) {
    return (Math.abs(p1.x - p2.x) < 2) && (Math.abs(p1.y - p2.y) < 2)
  }

  // 递归遍历查看x轴和y轴是否有相同值的元素
  floodFill(p, n) {
    if (p.x < 0 || p.y < 0 || p.x >= gameOptions.fieldSize || p.y >= gameOptions.fieldSize) {
      return;
    }
    if (!this.tilesArray[p.y][p.x].isEmpty && this.tilesArray[p.y][p.x].value === n && !this.pointInArray(p)) {
      this.filled.push(p);
      this.floodFill(new Phaser.Point(p.x + 1, p.y), n);
      this.floodFill(new Phaser.Point(p.x - 1, p.y), n);
      this.floodFill(new Phaser.Point(p.x, p.y + 1), n);
      this.floodFill(new Phaser.Point(p.x, p.y - 1), n);
    }
  }

  // 检查fillled数组中是否包含这个焦点元素
  pointInArray(p) {
    for (let i = 0; i < this.filled.length; i++) {
      if (this.filled[i].x === p.x && this.filled[i].y === p.y) {
        return true;
      }
    }
    return false;
  }

  // 重启游戏
  reloadGame() {
    game.state.restart()
  }
}

